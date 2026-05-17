import json
import random
import re
import unicodedata
from typing import Any

import numpy as np

import httpx
from openai import OpenAI
from sqlmodel import Session, select

from src.app.core.config import DEFAULT_MODEL, OPENAI_API_KEY
from src.app.models.domain import CoachMessage, CoachThread, Deck, Flashcard, Progress
from src.app.services.analytics_service import get_analytics
from src.app.core.time import utc_now_naive
from src.app.services import evaluation_service
from src.app.services.goal_service import list_goals

STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "what", "when", "where", "which", "into",
    "cua", "cac", "mot", "nhung", "trong", "ngoai", "khong", "duoc", "la", "va", "voi", "cho",
    "khi", "neu", "hay", "nhu", "den", "tai", "ve", "co", "nao", "gi", "qua", "sau", "truoc",
}


COACH_SYSTEM_PROMPT = """You are Memio Coach, an AI study companion inside Memio.
Your job is to coordinate the learner's study journey, not just answer questions.

Priority order:
1. Use internal Memio data first: decks, flashcards, progress, weak cards, analytics.
2. Use source_context citations when available, before web context.
3. Use web context only when internal context is insufficient or the user asks beyond their deck.
4. If internal context conflicts with web context, trust the internal Memio material and mention that web was treated as secondary.

Be friendly, concise, and actionable. Teach with Socratic questions when useful.
If exam goals are present, make planning advice deadline-aware and mention realistic daily workload.
Return ONLY valid JSON with:
{
  "answer": "markdown answer",
  "citation_ids": ["c1"],
  "actions": [{"type": "start_study", "label": "Ôn ngay", "href": "/study/1", "payload": {}, "requires_confirmation": false}]
}

Allowed action types:
- start_study: href /study/{deck_id}
- start_challenge: href /play/{deck_id}
- open_deck: href /workspace
- create_cards: href /generate?deckId={deck_id}
- quiz_in_chat: no href, only continue in chat

Actions that change stored learning content must require confirmation. Navigation and opening study/challenge do not.
When the user asks to be quizzed inside chat, prefer quiz_in_chat instead of start_challenge.
When weak concept clusters are present, use them to explain the underlying concept gap instead of only listing cards.
Use the user's language. Prefer Vietnamese if the user writes Vietnamese.
"""


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def get_or_create_thread(
    session: Session,
    user_id: int,
    thread_id: int | None = None,
    context_deck_id: int | None = None,
) -> CoachThread:
    if thread_id:
        thread = session.exec(
            select(CoachThread).where(CoachThread.id == thread_id, CoachThread.user_id == user_id)
        ).first()
        if thread:
            return thread

    title = "Memio Coach"
    if context_deck_id:
        deck = session.get(Deck, context_deck_id)
        if deck:
            title = f"Coach: {deck.name}"

    thread = CoachThread(user_id=user_id, title=title, context_deck_id=context_deck_id)
    session.add(thread)
    session.commit()
    session.refresh(thread)
    return thread


def list_threads(session: Session, user_id: int, limit: int = 20) -> list[CoachThread]:
    statement = (
        select(CoachThread)
        .where(CoachThread.user_id == user_id)
        .order_by(CoachThread.updated_at.desc())
        .limit(max(1, min(limit, 50)))
    )
    return list(session.exec(statement).all())


def list_messages(session: Session, user_id: int, thread_id: int) -> list[CoachMessage]:
    thread = session.exec(select(CoachThread).where(CoachThread.id == thread_id, CoachThread.user_id == user_id)).first()
    if not thread:
        return []
    statement = (
        select(CoachMessage)
        .where(CoachMessage.thread_id == thread_id, CoachMessage.user_id == user_id)
        .order_by(CoachMessage.created_at.asc())
    )
    return list(session.exec(statement).all())


def save_message(
    session: Session,
    thread: CoachThread,
    user_id: int,
    role: str,
    content: str,
    citations: list[dict] | None = None,
    actions: list[dict] | None = None,
) -> CoachMessage:
    msg = CoachMessage(
        thread_id=thread.id,
        user_id=user_id,
        role=role,
        content=content,
        citations_json=_json_dumps(citations or []),
        actions_json=_json_dumps(actions or []),
    )
    thread.updated_at = utc_now_naive()
    session.add(thread)
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return msg


def _normalize_token_text(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFD", text.lower())
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    tokens = re.findall(r"[a-z0-9]{3,}", stripped)
    return [token for token in tokens if token not in STOPWORDS]


def _compact_text(text: str, max_chars: int = 120) -> str:
    clean = " ".join((text or "").split())
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars - 1].rstrip() + "…"


def _weakness_score(card: Flashcard, progress: Progress | None) -> int:
    score = 0
    if progress:
        if progress.last_quality in (0, 1):
            score += 8
        elif progress.last_quality == 2:
            score += 4
        if progress.ease_factor is not None:
            if progress.ease_factor < 2.0:
                score += 7
            elif progress.ease_factor < 2.3:
                score += 4
        if progress.repetition == 0:
            score += 3
    else:
        score += 3
    if card.difficulty == "hard":
        score += 3
    elif card.difficulty == "medium":
        score += 1
    return score


def _cluster_label(cards: list[Flashcard], deck: Deck) -> str:
    tokens: dict[str, int] = {}
    for card in cards:
        for token in _normalize_token_text(f"{card.front} {card.back} {card.source_context or ''}")[:28]:
            tokens[token] = tokens.get(token, 0) + 1
    ranked = [token for token, _count in sorted(tokens.items(), key=lambda item: (item[1], len(item[0])), reverse=True)]
    if ranked:
        return " ".join(ranked[:2]).title()
    return deck.name


def _concept_key(card: Flashcard, deck: Deck) -> str:
    tokens = _normalize_token_text(f"{card.front} {card.back} {card.source_context or ''}")
    if not tokens:
        return f"deck-{deck.id}"
    ranked: dict[str, int] = {}
    for token in tokens[:40]:
        ranked[token] = ranked.get(token, 0) + 1
    top = [token for token, _count in sorted(ranked.items(), key=lambda item: (item[1], len(item[0])), reverse=True)[:2]]
    return f"{deck.id}-{'-'.join(top) if top else 'general'}"


def _embed_texts(texts: list[str], client: OpenAI) -> list[list[float]]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[t[:500] for t in texts],
    )
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]


def _greedy_cluster_ids(embeddings: list[list[float]], threshold: float = 0.70) -> list[int]:
    """Greedy centroid-based clustering. Returns a cluster id per embedding."""
    centroids: list[tuple[np.ndarray, int]] = []
    cluster_ids: list[int] = []
    for emb in embeddings:
        arr = np.array(emb, dtype=np.float32)
        best_cid, best_sim = -1, threshold
        for cid, (csum, cnt) in enumerate(centroids):
            c = csum / cnt
            denom = float(np.linalg.norm(arr) * np.linalg.norm(c))
            sim = float(np.dot(arr, c) / denom) if denom > 0 else 0.0
            if sim > best_sim:
                best_sim, best_cid = sim, cid
        if best_cid == -1:
            centroids.append((arr.copy(), 1))
            cluster_ids.append(len(centroids) - 1)
        else:
            csum, cnt = centroids[best_cid]
            centroids[best_cid] = (csum + arr, cnt + 1)
            cluster_ids.append(best_cid)
    return cluster_ids


def _centroid_label(cards: list[Flashcard], embeddings: list[list[float]]) -> str:
    """Pick the card front nearest to the cluster centroid as the label."""
    if not cards:
        return "Chủ đề chung"
    front = cards[0].front.strip()
    if len(cards) == 1:
        return (front[:37] + "…") if len(front) > 40 else front
    arrs = np.array(embeddings, dtype=np.float32)
    centroid = arrs.mean(axis=0)
    norm_c = float(np.linalg.norm(centroid))
    norms = np.linalg.norm(arrs, axis=1).astype(float)
    sims = (arrs @ centroid) / (norms * norm_c + 1e-9)
    best_idx = int(np.argmax(sims))
    front = cards[best_idx].front.strip()
    return (front[:37] + "…") if len(front) > 40 else front


_Item = tuple[int, Flashcard, Deck, "Progress | None"]


def _token_group(
    candidates: list[_Item],
    out: dict[str, tuple[str, list[_Item]]],
) -> None:
    """Populate `out` using token-frequency cluster keys (fallback when no API key)."""
    for item in candidates:
        _, card, deck, _ = item
        key = _concept_key(card, deck)
        if key not in out:
            out[key] = ("", [])
        out[key][1].append(item)
    # Compute labels after all cards are grouped
    for key, (_, items) in out.items():
        cards = [c for _, c, _, _ in items]
        deck = items[0][2]
        out[key] = (_cluster_label(cards, deck), items)


def build_learning_intelligence(session: Session, user_id: int, limit: int = 4) -> dict:
    max_clusters = max(1, min(limit, 8))
    statement = (
        select(Flashcard, Deck, Progress)
        .join(Deck, Flashcard.deck_id == Deck.id)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Deck.user_id == user_id)
        .order_by(Flashcard.created_at.desc())
        .limit(240)
    )
    rows = session.exec(statement).all()

    weak_rows: list[_Item] = []
    for card, deck, progress in rows:
        score = _weakness_score(card, progress)
        if score >= 4:
            weak_rows.append((score, card, deck, progress))

    weak_rows.sort(key=lambda item: (item[0], int(item[1].id or 0)), reverse=True)
    candidates = weak_rows[:80]

    # clustered maps key → (label, items)
    clustered: dict[str, tuple[str, list[_Item]]] = {}

    api_key = OPENAI_API_KEY.strip()
    if api_key and candidates:
        try:
            client = OpenAI(api_key=api_key)
            texts = [f"{c.front} {c.back}"[:500] for _, c, _, _ in candidates]
            embeddings = _embed_texts(texts, client)
            cids = _greedy_cluster_ids(embeddings)

            sem: dict[int, list[tuple[_Item, list[float]]]] = {}
            for cid, item, emb in zip(cids, candidates, embeddings):
                sem.setdefault(cid, []).append((item, emb))

            for cid, group in sem.items():
                items = [g[0] for g in group]
                embs = [g[1] for g in group]
                label = _centroid_label([i[1] for i in items], embs)
                clustered[f"sem-{cid}"] = (label, items)
        except Exception:
            _token_group(candidates, clustered)
    else:
        _token_group(candidates, clustered)

    clusters: list[dict] = []
    for key, (label, items) in clustered.items():
        items.sort(key=lambda item: (item[0], int(item[1].id or 0)), reverse=True)
        if not items:
            continue
        cards = [card for _, card, _, _ in items]
        deck = items[0][2]
        total_score = sum(score for score, _, _, _ in items)
        max_score = max(1, len(items) * 18)
        mastery_score = max(0, min(100, 100 - round((total_score / max_score) * 100)))
        top_item = items[0]
        reason = "Nhiều câu trả lời gần đây chưa chắc hoặc ease factor thấp."
        if top_item[3] and top_item[3].last_quality in (0, 1):
            reason = "Có thẻ vừa trả lời sai hoặc chưa chắc trong cụm này."
        elif top_item[1].difficulty == "hard":
            reason = "Cụm này có nhiều thẻ khó, nên ôn theo nhóm để nhớ chắc hơn."

        clusters.append({
            "id": f"wc-{key}",
            "label": label,
            "deck_id": deck.id,
            "deck_name": deck.name,
            "card_ids": [int(card.id) for card in cards if card.id],
            "card_count": len(cards),
            "mastery_score": mastery_score,
            "weakness_score": total_score,
            "reason": reason,
            "sample_cards": [
                {
                    "id": int(card.id),
                    "front": _compact_text(card.front),
                    "deck_id": deck.id,
                    "deck_name": deck.name,
                    "weakness_score": score,
                    "last_quality": progress.last_quality if progress else None,
                    "ease_factor": progress.ease_factor if progress else None,
                }
                for score, card, deck, progress in items[:3]
                if card.id
            ],
        })

    clusters.sort(key=lambda item: (item["weakness_score"], item["card_count"]), reverse=True)
    return {
        "clusters": clusters[:max_clusters],
        "total_weak_cards": len({int(card.id) for _, card, _, _ in weak_rows if card.id}),
    }


def build_context(session: Session, user_id: int, message: str, context_deck_id: int | None = None) -> tuple[str, list[dict], int | None]:
    decks = session.exec(select(Deck).where(Deck.user_id == user_id).order_by(Deck.created_at.desc())).all()
    analytics = get_analytics(session, user_id)
    learning_intelligence = build_learning_intelligence(session, user_id, 4)
    learning_goals = list_goals(session, user_id)
    weak_ids = {c.get("id") for c in analytics.get("weak_areas", {}).get("weak_cards", []) if c.get("id")}
    query = message.lower()

    statement = (
        select(Flashcard, Deck, Progress)
        .join(Deck, Flashcard.deck_id == Deck.id)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Deck.user_id == user_id)
        .order_by(Flashcard.created_at.desc())
        .limit(160)
    )
    if context_deck_id:
        statement = statement.where(Flashcard.deck_id == context_deck_id)
    rows = session.exec(statement).all()

    scored: list[tuple[int, Flashcard, Deck, Progress | None]] = []
    for card, deck, progress in rows:
        haystack = f"{deck.name} {deck.description} {card.front} {card.back} {card.source_context or ''}".lower()
        score = 0
        for token in query.split():
            if len(token) >= 3 and token in haystack:
                score += 4
        if card.id in weak_ids:
            score += 5
        if progress and progress.last_quality in (0, 1):
            score += 4
        if progress and progress.repetition > 0 and (progress.next_review is None):
            score += 2
        if context_deck_id and card.deck_id == context_deck_id:
            score += 3
        scored.append((score, card, deck, progress))

    scored.sort(key=lambda item: item[0], reverse=True)
    top_cards = scored[:20]
    citations: list[dict] = []
    card_lines: list[str] = []
    for idx, (_score, card, deck, progress) in enumerate(top_cards, start=1):
        cid = f"c{idx}"
        source_type = "source_context" if card.source_context else "card"
        excerpt = (card.source_context or card.back or card.front)[:500]
        citations.append({
            "id": cid,
            "label": f"{deck.name} / Card {card.id}",
            "text": excerpt,
            "source_type": source_type,
            "source_label": "Source context" if source_type == "source_context" else "Internal card",
            "priority": 1 if source_type == "source_context" else 2,
            "deck_id": deck.id,
            "card_id": card.id,
        })
        card_lines.append(
            f"[{cid}] deck_id={deck.id}, card_id={card.id}, deck={deck.name}, "
            f"difficulty={card.difficulty}, last_quality={getattr(progress, 'last_quality', None)}, "
            f"front={card.front}, back={card.back}, source_context={excerpt}"
        )

    deck_lines = [
        f"deck_id={d.id}, name={d.name}, description={d.description}, public={d.is_public}"
        for d in decks[:20]
    ]
    default_deck_id = context_deck_id or (decks[0].id if decks else None)
    context = "\n".join([
        "USER ANALYTICS:",
        _json_dumps({
            "streak": analytics.get("streak"),
            "forgetting_rate": analytics.get("forgetting_rate"),
            "total_reviewed": analytics.get("total_reviewed"),
            "weak_decks": analytics.get("weak_areas", {}).get("weak_decks", []),
            "weak_concept_clusters": learning_intelligence.get("clusters", []),
            "learning_goals": learning_goals,
        }),
        "DECKS:",
        "\n".join(deck_lines) or "No decks.",
        "RELEVANT FLASHCARDS:",
        "\n".join(card_lines) or "No flashcards found.",
    ])
    return context, citations, default_deck_id


def web_search(query: str) -> list[dict]:
    if not query.strip():
        return []
    try:
        with httpx.Client(timeout=8, follow_redirects=True) as client:
            resp = client.get("https://api.duckduckgo.com/", params={
                "q": query,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1",
            })
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        return []

    results: list[dict] = []
    abstract = data.get("AbstractText")
    if abstract:
        results.append({
            "id": "w1",
            "label": data.get("Heading") or "Web result",
            "text": abstract[:700],
            "source_type": "web",
            "source_label": "External web",
            "priority": 3,
            "url": data.get("AbstractURL"),
        })
    for topic in data.get("RelatedTopics", [])[:3]:
        if isinstance(topic, dict) and topic.get("Text"):
            results.append({
                "id": f"w{len(results) + 1}",
                "label": topic.get("FirstURL") or "Web result",
                "text": topic["Text"][:500],
                "source_type": "web",
                "source_label": "External web",
                "priority": 3,
                "url": topic.get("FirstURL"),
            })
    return results[:3]


def _fallback_actions(default_deck_id: int | None) -> list[dict]:
    if not default_deck_id:
        return [{"type": "create_cards", "label": "Tạo deck hoặc thêm thẻ", "href": "/generate", "payload": {}, "requires_confirmation": False}]
    return [
        {"type": "quiz_in_chat", "label": "Quiz trong chat", "payload": {"deck_id": default_deck_id}, "requires_confirmation": False},
        {"type": "start_study", "label": "Ôn ngay", "href": f"/study/{default_deck_id}", "payload": {"deck_id": default_deck_id}, "requires_confirmation": False},
    ]


def _coerce_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _deck_id_from_href(href: str | None) -> int | None:
    if not href:
        return None
    match = re.search(r"/(?:study|play)/(\d+)", href)
    if match:
        return _coerce_int(match.group(1))
    match = re.search(r"[?&]deckId=(\d+)", href)
    if match:
        return _coerce_int(match.group(1))
    return None


def sanitize_actions(actions: Any, valid_deck_ids: set[int], default_deck_id: int | None) -> list[dict]:
    if not isinstance(actions, list):
        return _fallback_actions(default_deck_id)

    sanitized: list[dict] = []
    for action in actions:
        if not isinstance(action, dict):
            continue
        action_type = str(action.get("type") or "").strip()
        label = str(action.get("label") or "").strip()[:80]
        payload = action.get("payload") if isinstance(action.get("payload"), dict) else {}
        payload_deck_id = _coerce_int(payload.get("deck_id"))
        href = str(action.get("href") or "").strip() or None
        href_deck_id = _deck_id_from_href(href)
        deck_id = payload_deck_id or href_deck_id or default_deck_id

        if action_type in {"start_study", "start_challenge", "create_cards"}:
            if not deck_id or deck_id not in valid_deck_ids:
                continue
            if action_type == "start_study":
                href = f"/study/{deck_id}"
                label = label or "Ôn ngay"
            elif action_type == "start_challenge":
                href = f"/play/{deck_id}"
                label = label or "Mở Thử thách"
            else:
                href = f"/generate?deckId={deck_id}"
                label = label or "Thêm thẻ"
            sanitized.append({
                "type": action_type,
                "label": label,
                "href": href,
                "payload": {"deck_id": deck_id},
                "requires_confirmation": False,
            })
        elif action_type == "quiz_in_chat":
            if deck_id and deck_id not in valid_deck_ids:
                deck_id = default_deck_id
            sanitized.append({
                "type": "quiz_in_chat",
                "label": label or "Quiz trong chat",
                "payload": {"deck_id": deck_id} if deck_id else {},
                "requires_confirmation": False,
            })
        elif action_type == "open_deck":
            sanitized.append({
                "type": "open_deck",
                "label": label or "Mở workspace",
                "href": "/workspace",
                "payload": {},
                "requires_confirmation": False,
            })

    return sanitized[:4] or _fallback_actions(default_deck_id)


def fallback_citations(answer: str, used_citations: list[dict], available: list[dict]) -> list[dict]:
    if used_citations or not available:
        return sort_citations_by_trust(used_citations)
    answer_lower = answer.lower()
    internal = [c for c in available if c.get("source_type") in ("source_context", "card")]
    scored: list[tuple[int, dict]] = []
    for citation in internal:
        haystack = f"{citation.get('label', '')} {citation.get('text', '')}".lower()
        score = 0
        for token in answer_lower.split():
            if len(token) >= 4 and token in haystack:
                score += 1
        scored.append((score, citation))
    scored.sort(key=lambda item: item[0], reverse=True)
    picked = [citation for score, citation in scored if score > 0][:3]
    return sort_citations_by_trust(picked or internal[:2])


def sort_citations_by_trust(citations: list[dict]) -> list[dict]:
    return sorted(citations, key=lambda item: (item.get("priority", 99), item.get("id", "")))


def log_trust_event(
    session: Session,
    user_id: int,
    event_type: str,
    thread_id: int | None = None,
    message_id: int | None = None,
    citation_id: str | None = None,
    value: str | None = None,
    source_type: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
) -> None:
    evaluation_service.log_telemetry_event(
        session,
        user_id=user_id,
        event_type=f"coach_{event_type}",
        target_type=target_type or "coach_message",
        target_id=target_id or message_id,
        metadata={
            "thread_id": thread_id,
            "citation_id": citation_id,
            "value": value,
            "source_type": source_type,
        },
    )


def call_coach_llm(
    session: Session,
    user_id: int,
    message: str,
    context: str,
    citations: list[dict],
    default_deck_id: int | None,
    mode: str | None = None,
    valid_deck_ids: set[int] | None = None,
) -> tuple[str, list[dict], list[dict]]:
    api_key = OPENAI_API_KEY.strip()
    if not api_key:
        return (
            "Mình chưa thấy `OPENAI_API_KEY` được cấu hình, nên chưa thể trả lời bằng AI.",
            [],
            _fallback_actions(default_deck_id),
        )

    web_results: list[dict] = []
    lower = message.lower()
    if any(term in lower for term in ["web", "internet", "mới nhất", "latest", "hiện nay", "ngoài tài liệu"]):
        web_results = web_search(message)

    all_citations = citations + web_results
    web_context = "\n".join(
        f"[{item['id']}] {item.get('label')}: {item.get('text')} ({item.get('url') or ''})"
        for item in web_results
    )

    user_payload = {
        "mode": mode,
        "user_message": message,
        "internal_context": context,
        "web_context": web_context,
        "available_citation_ids": [c["id"] for c in all_citations],
        "default_deck_id": default_deck_id,
    }

    client = OpenAI(api_key=api_key)
    with evaluation_service.track_ai_operation(
        session,
        user_id=user_id,
        operation_type="coach_chat",
        endpoint="/api/coach/message",
        metadata={
            "mode": mode,
            "default_deck_id": default_deck_id,
            "internal_citation_count": len(citations),
            "web_citation_count": len(web_results),
        },
    ) as op:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            temperature=0.35,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": COACH_SYSTEM_PROMPT},
                {"role": "user", "content": _json_dumps(user_payload)},
            ],
        )
        prompt_tokens, completion_tokens, total_tokens = evaluation_service.token_usage_from_response(response)
        op["prompt_tokens"] = prompt_tokens
        op["completion_tokens"] = completion_tokens
        op["total_tokens"] = total_tokens
    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = {"answer": raw, "citation_ids": [], "actions": []}

    used_ids = set(parsed.get("citation_ids") or [])
    used_citations = sort_citations_by_trust([c for c in all_citations if c.get("id") in used_ids])
    answer = parsed.get("answer") or "Mình chưa tạo được câu trả lời phù hợp."
    used_citations = fallback_citations(answer, used_citations, all_citations)
    actions = sanitize_actions(parsed.get("actions"), valid_deck_ids or set(), default_deck_id)
    return answer, used_citations, actions


def stored_message_to_dict(message: CoachMessage) -> dict:
    return {
        "id": message.id,
        "role": message.role,
        "content": message.content,
        "citations": _json_loads(message.citations_json, []),
        "actions": _json_loads(message.actions_json, []),
        "created_at": message.created_at,
    }


def build_inline_quiz(
    session: Session,
    user_id: int,
    deck_id: int | None = None,
    count: int = 5,
    card_ids: list[int] | None = None,
) -> list[dict]:
    limit = max(1, min(count, 10))
    statement = (
        select(Flashcard, Deck, Progress)
        .join(Deck, Flashcard.deck_id == Deck.id)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Deck.user_id == user_id)
        .order_by(Flashcard.created_at.desc())
        .limit(180)
    )
    if deck_id:
        statement = statement.where(Flashcard.deck_id == deck_id)
    if card_ids:
        safe_card_ids = [card_id for card_id in card_ids[:30] if isinstance(card_id, int)]
        if safe_card_ids:
            statement = statement.where(Flashcard.id.in_(safe_card_ids))
    rows = session.exec(statement).all()
    if len(rows) < 2:
        return []

    def priority(row: tuple[Flashcard, Deck, Progress | None]) -> tuple[int, int]:
        card, _deck, progress = row
        score = 0
        if progress:
            if progress.last_quality in (0, 1):
                score += 8
            if progress.ease_factor and progress.ease_factor < 2.1:
                score += 5
            if progress.repetition == 0:
                score += 3
        else:
            score += 4
        if card.difficulty == "hard":
            score += 2
        return (score, int(card.id or 0))

    ordered = sorted(rows, key=priority, reverse=True)
    selected = ordered[:limit]
    questions: list[dict] = []
    for idx, (card, deck, progress) in enumerate(selected, start=1):
        answer = _compact_text(card.back)
        same_deck_answers = [
            _compact_text(other.back)
            for other, other_deck, _other_progress in rows
            if other_deck.id == deck.id and other.id != card.id and other.back
        ]
        fallback_answers = [
            _compact_text(other.back)
            for other, _other_deck, _other_progress in rows
            if other.id != card.id and other.back
        ]
        distractors = [a for a in same_deck_answers if a != answer]
        if len(distractors) < 3:
            distractors += [a for a in fallback_answers if a != answer and a not in distractors]
        random.shuffle(distractors)
        choices = [answer] + distractors[:3]
        while len(choices) < 4:
            choices.append("Chưa đủ dữ kiện trong deck")
        random.shuffle(choices)
        questions.append({
            "id": f"coach-q{idx}",
            "card_id": card.id,
            "deck_id": deck.id,
            "deck_name": deck.name,
            "prompt": card.front,
            "choices": choices,
            "answer_index": choices.index(answer),
            "explanation": card.back,
            "source_context": card.source_context or None,
            "difficulty": card.difficulty,
            "ease_factor": progress.ease_factor if progress else None,
            "repetition": progress.repetition if progress else None,
            "interval": progress.interval if progress else None,
        })
    return questions
