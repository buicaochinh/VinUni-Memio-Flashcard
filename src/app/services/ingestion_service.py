import datetime
import hashlib
import json
import xml.etree.ElementTree as ET
from typing import Any

import httpx
from fastapi import HTTPException
from sqlmodel import Session, select

from src.app.api.endpoints.cards import _generate_cards_chunked
from src.app.models.domain import (
    Deck,
    ExternalNote,
    IngestionCursor,
    IngestionItem,
    IngestionRun,
    IngestionSource,
)
from src.app.services import card_service


SUPPORTED_PROVIDERS = {"rss", "notion", "obsidian", "roam"}
TOPIC_KEYWORDS = {
    "Tech": ["ai", "software", "programming", "startup", "cloud", "data", "devops", "tech"],
    "Business": ["business", "market", "finance", "economy", "startup", "management", "sales"],
    "Language": ["english", "grammar", "vocabulary", "listening", "reading", "ielts", "language"],
}


class IngestionSyncError(RuntimeError):
    pass


class SimplePage:
    def __init__(self, text: str):
        self.page_content = text


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _parse_config(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _dump_config(data: dict[str, Any] | None) -> str:
    return json.dumps(data or {}, ensure_ascii=True)


def _source_to_item(source: IngestionSource):
    payload = source.model_dump()
    payload["config"] = _parse_config(source.config_json)
    return payload


def _classify_topic(text: str) -> str:
    haystack = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return topic
    return "General"


def _checksum(*parts: str) -> str:
    joined = "||".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def _extract_text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join(node.itertext()).strip()


def _require_owned_deck(session: Session, user_id: int, deck_id: int | None) -> None:
    if deck_id is None:
        return
    deck = session.exec(select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Target deck not found")


def list_sources(session: Session, user_id: int) -> list[dict[str, Any]]:
    rows = session.exec(
        select(IngestionSource).where(IngestionSource.user_id == user_id).order_by(IngestionSource.created_at.desc())
    ).all()
    return [_source_to_item(r) for r in rows]


def create_source(session: Session, user_id: int, payload) -> dict[str, Any]:
    provider = payload.provider.strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    _require_owned_deck(session, user_id, payload.target_deck_id)
    source = IngestionSource(
        user_id=user_id,
        provider=provider,
        name=payload.name.strip(),
        source_url=(payload.source_url or "").strip() or None,
        target_deck_id=payload.target_deck_id,
        auto_tag=payload.auto_tag,
        frequency_minutes=payload.frequency_minutes,
        cards_per_item=payload.cards_per_item,
        sync_mode=payload.sync_mode,
        config_json=_dump_config(payload.config),
    )
    session.add(source)
    session.commit()
    session.refresh(source)
    return _source_to_item(source)


def update_source(session: Session, user_id: int, source_id: int, payload) -> dict[str, Any]:
    source = session.exec(
        select(IngestionSource).where(IngestionSource.id == source_id, IngestionSource.user_id == user_id)
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Ingestion source not found")
    if payload.target_deck_id is not None:
        _require_owned_deck(session, user_id, payload.target_deck_id)
        source.target_deck_id = payload.target_deck_id
    if payload.name is not None:
        source.name = payload.name.strip() or source.name
    if payload.status is not None:
        source.status = payload.status.strip() or source.status
    if payload.source_url is not None:
        source.source_url = payload.source_url.strip() or None
    if payload.auto_tag is not None:
        source.auto_tag = payload.auto_tag
    if payload.frequency_minutes is not None:
        source.frequency_minutes = payload.frequency_minutes
    if payload.cards_per_item is not None:
        source.cards_per_item = payload.cards_per_item
    if payload.sync_mode is not None:
        source.sync_mode = payload.sync_mode.strip() or source.sync_mode
    if payload.config is not None:
        source.config_json = _dump_config(payload.config)
    source.updated_at = _now()
    session.add(source)
    session.commit()
    session.refresh(source)
    return _source_to_item(source)


def delete_source(session: Session, user_id: int, source_id: int) -> None:
    source = session.exec(
        select(IngestionSource).where(IngestionSource.id == source_id, IngestionSource.user_id == user_id)
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Ingestion source not found")
    session.delete(source)
    session.commit()


def list_runs(session: Session, user_id: int, source_id: int) -> list[IngestionRun]:
    source = session.exec(
        select(IngestionSource).where(IngestionSource.id == source_id, IngestionSource.user_id == user_id)
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Ingestion source not found")
    return session.exec(
        select(IngestionRun).where(IngestionRun.source_id == source_id).order_by(IngestionRun.started_at.desc())
    ).all()


async def _fetch_rss_entries(source: IngestionSource) -> list[dict[str, Any]]:
    if not source.source_url:
        raise IngestionSyncError("RSS source_url is required")
    timeout = httpx.Timeout(20.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.get(source.source_url)
        response.raise_for_status()
    try:
        root = ET.fromstring(response.text)
    except ET.ParseError as exc:
        raise IngestionSyncError("Invalid RSS XML") from exc

    entries: list[dict[str, Any]] = []
    items = root.findall(".//item")
    if not items:
        items = root.findall(".//{http://www.w3.org/2005/Atom}entry")

    for node in items[:20]:
        title = _extract_text(node.find("title")) or _extract_text(node.find("{http://www.w3.org/2005/Atom}title"))
        link = _extract_text(node.find("link"))
        if not link:
            link_node = node.find("{http://www.w3.org/2005/Atom}link")
            if link_node is not None:
                link = (link_node.attrib.get("href") or "").strip()
        summary = (
            _extract_text(node.find("description"))
            or _extract_text(node.find("content"))
            or _extract_text(node.find("{http://www.w3.org/2005/Atom}summary"))
        )
        guid = _extract_text(node.find("guid")) or link or title
        if not title:
            continue
        entries.append(
            {
                "external_id": guid,
                "external_url": link or None,
                "title": title,
                "content_text": summary or title,
                "summary": summary or None,
                "topic_tag": _classify_topic(f"{title}\n{summary}"),
            }
        )
    return entries


def _build_note_preview(source: IngestionSource) -> list[dict[str, Any]]:
    config = _parse_config(source.config_json)
    notes = config.get("sample_notes") or []
    entries: list[dict[str, Any]] = []
    for idx, note in enumerate(notes[:20]):
        title = str(note.get("title") or f"{source.provider.title()} note {idx + 1}").strip()
        body = str(note.get("content_text") or note.get("highlights_text") or "").strip()
        entries.append(
            {
                "external_id": str(note.get("external_id") or title),
                "external_url": note.get("external_url"),
                "title": title,
                "content_text": body or title,
                "summary": str(note.get("summary") or "").strip() or None,
                "topic_tag": _classify_topic(f"{title}\n{body}"),
            }
        )
    return entries


async def fetch_source_items(source: IngestionSource) -> list[dict[str, Any]]:
    provider = source.provider.strip().lower()
    if provider == "rss":
        return await _fetch_rss_entries(source)
    if provider in {"notion", "obsidian", "roam"}:
        return _build_note_preview(source)
    raise IngestionSyncError("Unsupported provider")


def _get_or_create_cursor(session: Session, source_id: int) -> IngestionCursor:
    cursor = session.exec(select(IngestionCursor).where(IngestionCursor.source_id == source_id)).first()
    if cursor:
        return cursor
    cursor = IngestionCursor(source_id=source_id)
    session.add(cursor)
    session.commit()
    session.refresh(cursor)
    return cursor


def _record_item(session: Session, source: IngestionSource, item: dict[str, Any]) -> tuple[IngestionItem, bool]:
    checksum = _checksum(
        str(item.get("external_id") or ""),
        str(item.get("title") or ""),
        str(item.get("content_text") or ""),
    )
    existing = session.exec(
        select(IngestionItem).where(IngestionItem.source_id == source.id, IngestionItem.checksum == checksum)
    ).first()
    if existing:
        return existing, False

    row = IngestionItem(
        source_id=source.id,
        external_id=str(item.get("external_id") or "") or None,
        external_url=item.get("external_url"),
        title=str(item.get("title") or "").strip(),
        content_text=str(item.get("content_text") or "").strip() or None,
        summary=str(item.get("summary") or "").strip() or None,
        topic_tag=str(item.get("topic_tag") or "").strip() or None,
        checksum=checksum,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row, True


def _upsert_external_note(session: Session, source: IngestionSource, item: dict[str, Any]) -> None:
    if source.provider not in {"notion", "obsidian", "roam"}:
        return
    external_note_id = str(item.get("external_id") or "").strip()
    if not external_note_id:
        return
    row = session.exec(
        select(ExternalNote).where(
            ExternalNote.source_id == source.id,
            ExternalNote.external_note_id == external_note_id,
        )
    ).first()
    if not row:
        row = ExternalNote(
            source_id=source.id,
            external_note_id=external_note_id,
            title=str(item.get("title") or "").strip() or external_note_id,
        )
    row.content_text = str(item.get("content_text") or "").strip() or row.content_text
    row.highlights_text = str(item.get("summary") or "").strip() or row.highlights_text
    row.last_seen_at = _now()
    session.add(row)
    session.commit()


async def sync_source(session: Session, source: IngestionSource, *, preview_only: bool = False) -> dict[str, Any]:
    run = IngestionRun(source_id=source.id, status="running")
    session.add(run)
    session.commit()
    session.refresh(run)

    created_cards = 0
    preview_cards = 0
    normalized_items = 0
    fetched_items = 0

    try:
        fetched = await fetch_source_items(source)
        fetched_items = len(fetched)
        normalized: list[tuple[IngestionItem, dict[str, Any], bool]] = []

        for raw in fetched:
            item_row, is_new = _record_item(session, source, raw)
            _upsert_external_note(session, source, raw)
            normalized.append((item_row, raw, is_new))
        normalized_items = len(normalized)

        for item_row, raw, is_new in normalized:
            if not is_new and not preview_only:
                continue
            text = (raw.get("content_text") or raw.get("summary") or raw.get("title") or "").strip()
            if not text:
                continue
            pages = [SimplePage(text)]
            cards = await _generate_cards_chunked(pages, source.cards_per_item)
            tag = raw.get("topic_tag")
            if source.auto_tag and tag:
                for card in cards:
                    card["front"] = f"[{tag}] {card['front']}"
            if preview_only:
                preview_cards += len(cards)
            elif source.target_deck_id:
                card_service.bulk_add_flashcards(session, source.target_deck_id, cards)
                created_cards += len(cards)
                item_row.last_processed_at = _now()
                session.add(item_row)
                session.commit()

        cursor = _get_or_create_cursor(session, source.id)
        cursor.cursor_value = _now().isoformat()
        cursor.updated_at = _now()
        session.add(cursor)

        source.last_synced_at = _now()
        source.last_error = None
        source.updated_at = _now()
        session.add(source)

        run.status = "success"
        run.finished_at = _now()
        run.fetched_count = fetched_items
        run.normalized_count = normalized_items
        run.created_count = created_cards
        session.add(run)
        session.commit()
        session.refresh(run)
        return {
            "message": "success",
            "source_id": source.id,
            "run_id": run.id,
            "fetched_count": fetched_items,
            "normalized_count": normalized_items,
            "created_count": created_cards,
            "preview_cards": preview_cards,
        }
    except Exception as exc:
        message = str(exc)
        source.last_error = message[:500]
        source.updated_at = _now()
        run.status = "failed"
        run.finished_at = _now()
        run.fetched_count = fetched_items
        run.normalized_count = normalized_items
        run.created_count = created_cards
        run.error_message = message[:1000]
        session.add(source)
        session.add(run)
        session.commit()
        raise


async def sync_source_for_user(session: Session, user_id: int, source_id: int, *, preview_only: bool = False) -> dict[str, Any]:
    source = session.exec(
        select(IngestionSource).where(IngestionSource.id == source_id, IngestionSource.user_id == user_id)
    ).first()
    if not source:
        raise HTTPException(status_code=404, detail="Ingestion source not found")
    return await sync_source(session, source, preview_only=preview_only)
