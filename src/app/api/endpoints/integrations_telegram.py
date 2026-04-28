import datetime
import logging
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from src.app.db.session import get_session
from src.app.models.domain import ChatIntegration, LinkCode, Progress, Flashcard
from src.app.services.telegram_service import TelegramConfigError, send_message
from src.app.core.sm2 import get_updated_sm2_values
from src.app.services import card_service
from src.app.utils.jwt_auth import new_link_code


router = APIRouter()
logger = logging.getLogger(__name__)


def _is_start_command(text: str) -> bool:
    """Nhận /start, /start payload, /start@BotUsername (Telegram hay gửi dạng này trong nhóm)."""
    if not text:
        return False
    first = text.strip().split(maxsplit=1)[0]
    base = first.split("@", 1)[0].lower()
    return base == "/start"


def _extract_message(update: dict[str, Any]) -> Optional[dict[str, Any]]:
    return update.get("message") or update.get("edited_message")

def _extract_callback(update: dict[str, Any]) -> Optional[dict[str, Any]]:
    return update.get("callback_query")

def _parse_rate_data(data: str) -> Optional[tuple[int, int]]:
    # rate:{card_id}:{quality}
    if not data:
        return None
    parts = data.split(":")
    if len(parts) != 3 or parts[0] != "rate":
        return None
    try:
        return int(parts[1]), int(parts[2])
    except Exception:
        return None


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Minimal Telegram webhook:
    - /start: generate link-code (expires 10 min)
    - returns 200 quickly
    """
    update = await request.json()

    cb = _extract_callback(update)
    if cb:
        data = (cb.get("data") or "").strip()
        parsed = _parse_rate_data(data)
        if not parsed:
            return {"ok": True}
        card_id, quality = parsed
        if quality not in (0, 1, 2, 3):
            return {"ok": True}

        from_user = cb.get("from") or {}
        telegram_user_id = str(from_user.get("id") or "")
        if not telegram_user_id:
            return {"ok": True}

        integ = session.exec(
            select(ChatIntegration).where(
                ChatIntegration.provider == "telegram",
                ChatIntegration.provider_user_id == telegram_user_id,
            )
        ).first()
        if not integ:
            # Not linked
            return {"ok": True}

        # Load progress to compute updated SM-2 values
        progress = session.exec(
            select(Progress).where(Progress.user_id == integ.user_id, Progress.card_id == card_id)
        ).first()
        card_data = {
            "ease_factor": (progress.ease_factor if progress else 2.5),
            "repetition": (progress.repetition if progress else 0),
            "interval": (progress.interval if progress else 0),
        }
        interval, n, ef = get_updated_sm2_values(card_data, quality)
        card_service.update_card_progress(session, integ.user_id, card_id, interval, n, ef, quality)

        await send_message(
            chat_id=str(cb.get("message", {}).get("chat", {}).get("id") or ""),
            text="Đã lưu. Tiếp tục thẻ tiếp theo sẽ được gửi theo lịch.",
        )
        return {"ok": True}

    msg = _extract_message(update)
    if not msg:
        return {"ok": True}

    text = (msg.get("text") or "").strip()
    from_user = msg.get("from") or {}
    chat = msg.get("chat") or {}
    telegram_user_id = str(from_user.get("id") or "")
    chat_id = str(chat.get("id") or "")
    if not telegram_user_id or not chat_id:
        return {"ok": True}

    if _is_start_command(text):
        code = new_link_code()
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
        link = LinkCode(
            code=code,
            provider="telegram",
            provider_user_id=telegram_user_id,
            dm_chat_id=chat_id,
            expires_at=expires_at,
        )
        session.add(link)
        session.commit()

        body = (
            "Để liên kết Memio với Telegram, hãy nhập mã sau trong mục Liên kết (sidebar) của bạn:\n\n"
            f"{code}\n\n"
            "Mã có hiệu lực trong 10 phút."
        )
        try:
            await send_message(chat_id=chat_id, text=body)
        except TelegramConfigError as e:
            logger.error("Telegram /start: không gửi được tin — %s", e)
        except httpx.HTTPStatusError as e:
            logger.error(
                "Telegram /start: sendMessage lỗi HTTP %s — %s",
                e.response.status_code,
                e.response.text[:500] if e.response else "",
            )
        except httpx.RequestError as e:
            logger.error("Telegram /start: lỗi kết nối tới api.telegram.org — %s", e)
        return {"ok": True}

    return {"ok": True}

