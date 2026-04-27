from typing import Any, Optional

import httpx

from src.app.core.config import TELEGRAM_BOT_TOKEN


class TelegramConfigError(RuntimeError):
    pass


def _api_base() -> str:
    if not TELEGRAM_BOT_TOKEN:
        raise TelegramConfigError("TELEGRAM_BOT_TOKEN is not set")
    return f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


async def send_message(
    *,
    chat_id: str,
    text: str,
    reply_markup: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    url = f"{_api_base()}/sendMessage"
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.post(url, json=payload)
        res.raise_for_status()
        return res.json()


def send_message_sync(
    *,
    chat_id: str,
    text: str,
    reply_markup: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    url = f"{_api_base()}/sendMessage"
    payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup
    with httpx.Client(timeout=10) as client:
        res = client.post(url, json=payload)
        res.raise_for_status()
        return res.json()

