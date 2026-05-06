import base64
import datetime
import hashlib
import hmac
import json
from typing import Any, Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlmodel import Session, select

from src.app.core.config import (
    NOTION_API_VERSION,
    NOTION_CLIENT_ID,
    NOTION_CLIENT_SECRET,
    NOTION_FRONTEND_REDIRECT_URL,
    NOTION_REDIRECT_URI,
)
from src.app.core.time import utc_now, utc_now_naive
from src.app.models.domain import OAuthConnection
from src.app.utils.jwt_auth import JWT_SECRET


NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize"
NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_SEARCH_URL = "https://api.notion.com/v1/search"
NOTION_BLOCK_CHILDREN_URL = "https://api.notion.com/v1/blocks/{block_id}/children"


class NotionConfigError(RuntimeError):
    pass


class NotionApiError(RuntimeError):
    pass


def _now() -> datetime.datetime:
    return utc_now_naive()


def _require_oauth_config() -> None:
    if not NOTION_CLIENT_ID or not NOTION_CLIENT_SECRET or not NOTION_REDIRECT_URI:
        raise NotionConfigError("Notion OAuth is not configured")
    if not JWT_SECRET:
        raise NotionConfigError("JWT secret is required for Notion OAuth state")


def _encode_state(user_id: int) -> str:
    issued = int(utc_now().timestamp())
    payload = {"user_id": user_id, "iat": issued}
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{b64}.{signature}"


def decode_state(state: str, max_age_seconds: int = 900) -> int:
    _require_oauth_config()
    try:
        payload_b64, signature = state.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc
    expected = hmac.new(JWT_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    padded = payload_b64 + "=" * (-len(payload_b64) % 4)
    try:
        raw = base64.urlsafe_b64decode(padded.encode("ascii"))
        payload = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from exc
    user_id = int(payload.get("user_id") or 0)
    issued = int(payload.get("iat") or 0)
    now_ts = int(utc_now().timestamp())
    if user_id <= 0 or issued <= 0 or now_ts - issued > max_age_seconds:
        raise HTTPException(status_code=400, detail="OAuth state expired")
    return user_id


def get_connect_url(user_id: int) -> str:
    _require_oauth_config()
    state = _encode_state(user_id)
    query = urlencode(
        {
            "client_id": NOTION_CLIENT_ID,
            "response_type": "code",
            "owner": "user",
            "redirect_uri": NOTION_REDIRECT_URI,
            "state": state,
        }
    )
    return f"{NOTION_AUTH_URL}?{query}"


def _oauth_basic_auth() -> str:
    pair = f"{NOTION_CLIENT_ID}:{NOTION_CLIENT_SECRET}".encode("utf-8")
    return base64.b64encode(pair).decode("ascii")


async def _request_access_token(code: str) -> dict[str, Any]:
    _require_oauth_config()
    headers = {
        "Authorization": f"Basic {_oauth_basic_auth()}",
        "Content-Type": "application/json",
    }
    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": NOTION_REDIRECT_URI,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(NOTION_TOKEN_URL, headers=headers, json=body)
    if response.status_code >= 400:
        raise NotionApiError(f"Notion token exchange failed ({response.status_code})")
    return response.json()


def _upsert_connection(session: Session, user_id: int, payload: dict[str, Any]) -> OAuthConnection:
    connection = session.exec(
        select(OAuthConnection).where(
            OAuthConnection.user_id == user_id,
            OAuthConnection.provider == "notion",
        )
    ).first()
    owner = payload.get("owner") or {}
    workspace_name = payload.get("workspace_name") or owner.get("workspace_name")
    provider_user_id = None
    if isinstance(owner.get("user"), dict):
        provider_user_id = str(owner["user"].get("id") or "") or None
    if not connection:
        connection = OAuthConnection(
            user_id=user_id,
            provider="notion",
            access_token=str(payload.get("access_token") or ""),
        )
    connection.access_token = str(payload.get("access_token") or "")
    connection.workspace_id = str(payload.get("workspace_id") or "") or None
    connection.workspace_name = str(workspace_name or "").strip() or None
    connection.workspace_icon = str(payload.get("workspace_icon") or "").strip() or None
    connection.owner_type = str(owner.get("type") or "").strip() or None
    connection.provider_user_id = provider_user_id
    connection.capabilities_json = json.dumps(payload.get("bot_id") or {}, ensure_ascii=True)
    connection.updated_at = _now()
    session.add(connection)
    session.commit()
    session.refresh(connection)
    return connection


async def exchange_code_for_connection(session: Session, user_id: int, code: str) -> OAuthConnection:
    payload = await _request_access_token(code)
    access_token = str(payload.get("access_token") or "").strip()
    if not access_token:
        raise NotionApiError("Notion access token missing")
    return _upsert_connection(session, user_id, payload)


def get_connection(session: Session, user_id: int) -> Optional[OAuthConnection]:
    return session.exec(
        select(OAuthConnection).where(
            OAuthConnection.user_id == user_id,
            OAuthConnection.provider == "notion",
        )
    ).first()


def require_connection(session: Session, user_id: int) -> OAuthConnection:
    row = get_connection(session, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notion is not connected")
    return row


def disconnect(session: Session, user_id: int) -> None:
    row = get_connection(session, user_id)
    if row:
        session.delete(row)
        session.commit()


def frontend_redirect_url(*, status: str, message: str = "") -> str:
    query = urlencode({"provider": "notion", "status": status, "message": message})
    return f"{NOTION_FRONTEND_REDIRECT_URL}?{query}"


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
    }


def _page_title(item: dict[str, Any]) -> str:
    title_nodes = (((item.get("properties") or {}).get("title") or {}).get("title")) or []
    parts = []
    for node in title_nodes:
        plain = str(node.get("plain_text") or "").strip()
        if plain:
            parts.append(plain)
    if parts:
        return " ".join(parts)
    child_title = str(item.get("child_page", {}).get("title") or "").strip()
    if child_title:
        return child_title
    return str(item.get("url") or item.get("id") or "Untitled").strip()


async def list_pages(session: Session, user_id: int) -> list[dict[str, Any]]:
    connection = require_connection(session, user_id)
    payload = {
        "filter": {"property": "object", "value": "page"},
        "sort": {"direction": "descending", "timestamp": "last_edited_time"},
        "page_size": 25,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(NOTION_SEARCH_URL, headers=_headers(connection.access_token), json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to list Notion pages")
    data = response.json()
    results = []
    for item in data.get("results") or []:
        if item.get("object") != "page":
            continue
        results.append(
            {
                "id": str(item.get("id") or ""),
                "title": _page_title(item),
                "url": item.get("url"),
                "last_edited_time": item.get("last_edited_time"),
                "object_type": "page",
            }
        )
    return results


async def _fetch_block_children(access_token: str, block_id: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    cursor: Optional[str] = None
    async with httpx.AsyncClient(timeout=20.0) as client:
        while True:
            params = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor
            response = await client.get(
                NOTION_BLOCK_CHILDREN_URL.format(block_id=block_id),
                headers=_headers(access_token),
                params=params,
            )
            if response.status_code >= 400:
                raise NotionApiError("Failed to fetch Notion block children")
            data = response.json()
            results.extend(data.get("results") or [])
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
    return results


def _rich_text_to_plain(items: list[dict[str, Any]] | None) -> str:
    if not items:
        return ""
    parts = []
    for item in items:
        text = str(item.get("plain_text") or "").strip()
        if text:
            parts.append(text)
    return "".join(parts).strip()


def _block_to_text(block: dict[str, Any]) -> str:
    block_type = str(block.get("type") or "")
    data = block.get(block_type) or {}
    if "rich_text" in data:
        return _rich_text_to_plain(data.get("rich_text"))
    if block_type in {"child_page", "child_database"}:
        return str(data.get("title") or "").strip()
    if block_type == "to_do":
        prefix = "[x] " if data.get("checked") else "[ ] "
        return prefix + _rich_text_to_plain(data.get("rich_text"))
    return ""


async def fetch_page_content(session: Session, user_id: int, page_id: str) -> dict[str, Any]:
    connection = require_connection(session, user_id)
    page_url = f"https://api.notion.com/v1/pages/{page_id}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        page_response = await client.get(page_url, headers=_headers(connection.access_token))
    if page_response.status_code == 404:
        raise HTTPException(status_code=404, detail="Notion page not found")
    if page_response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to fetch Notion page")
    page = page_response.json()
    blocks = await _fetch_block_children(connection.access_token, page_id)
    lines = [_block_to_text(block) for block in blocks]
    content = "\n".join(line for line in lines if line).strip()
    return {
        "external_id": str(page.get("id") or page_id),
        "external_url": page.get("url"),
        "title": _page_title(page),
        "content_text": content or _page_title(page),
        "summary": None,
        "last_edited_time": page.get("last_edited_time"),
        "topic_tag": None,
    }
