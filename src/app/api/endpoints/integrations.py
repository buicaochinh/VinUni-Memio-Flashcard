import re

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from src.app.api.deps import get_current_user_id
from src.app.core.time import (
    last_n_local_date_keys,
    local_date_key,
    utc_now_naive,
    validate_timezone,
)
from src.app.db.session import get_session
from src.app.models.domain import ChatIntegration, LinkCode, StudySession, Progress, Flashcard
from src.app.schemas.integrations import (
    IntegrationItem,
    LinkIntegrationRequest,
    LinkIntegrationResponse,
    UpdateIntegrationRequest,
)
from src.app.schemas.telegram import TelegramBotMeta
from src.app.services.telegram_service import TelegramConfigError, get_bot_username, send_message_sync


router = APIRouter()

_SEND_WINDOW_RE = re.compile(r"^\d{2}:\d{2}-\d{2}:\d{2}$")


@router.post("/link", response_model=LinkIntegrationResponse)
def link_integration(
    payload: LinkIntegrationRequest,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    link = session.exec(select(LinkCode).where(LinkCode.code == code)).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invalid code")

    now = utc_now_naive()
    if link.expires_at < now:
        raise HTTPException(status_code=400, detail="Code expired")
    if link.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Code already used")

    existing = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.user_id == user_id,
            ChatIntegration.provider == link.provider,
        )
    ).first()

    dm = link.dm_chat_id
    if existing:
        existing.provider_user_id = link.provider_user_id
        if dm:
            existing.dm_chat_id = dm
        session.add(existing)
    else:
        integ = ChatIntegration(
            user_id=user_id,
            provider=link.provider,
            provider_user_id=link.provider_user_id,
            dm_chat_id=dm,
        )
        session.add(integ)

    link.consumed_at = now
    link.consumed_by_user_id = user_id
    session.add(link)
    session.commit()

    return {"message": "success", "provider": link.provider, "provider_user_id": link.provider_user_id}


@router.get("/me", response_model=list[IntegrationItem])
def list_integrations(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    rows = session.exec(select(ChatIntegration).where(ChatIntegration.user_id == user_id)).all()
    return [IntegrationItem.model_validate(r) for r in rows]

@router.get("/telegram/meta", response_model=TelegramBotMeta)
async def telegram_bot_meta(user_id: int = Depends(get_current_user_id)):
    """
    Frontend helper to open the bot directly (and generate a QR code).
    Requires JWT (same as other integrations endpoints).
    """
    _ = user_id  # auth gate only
    try:
        username = await get_bot_username()
    except TelegramConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Cannot resolve Telegram bot meta")

    return TelegramBotMeta(username=username, url=f"https://t.me/{username}")


@router.patch("/{provider}", response_model=IntegrationItem)
def update_integration(
    provider: str,
    payload: UpdateIntegrationRequest,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    row = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.user_id == user_id,
            ChatIntegration.provider == provider,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    if payload.timezone is not None:
        try:
            row.timezone = validate_timezone(payload.timezone.strip() or row.timezone)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    if payload.send_window is not None:
        sw = payload.send_window.strip()
        if not _SEND_WINDOW_RE.match(sw):
            raise HTTPException(status_code=400, detail="send_window must match HH:MM-HH:MM")
        row.send_window = sw
    if payload.daily_goal is not None:
        row.daily_goal = payload.daily_goal
    if payload.group_target_id is not None:
        gt = payload.group_target_id.strip()
        row.group_target_id = gt or None

    session.add(row)
    session.commit()
    session.refresh(row)
    return IntegrationItem.model_validate(row)


@router.delete("/{provider}")
def delete_integration(
    provider: str,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    row = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.user_id == user_id,
            ChatIntegration.provider == provider,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    session.delete(row)
    session.commit()
    return {"message": "success", "provider": provider}


@router.post("/weekly_report/test")
def test_weekly_report(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """
    Send a one-off weekly report preview to the configured target:
    - uses Telegram integration for current user
    - sends to group_target_id if set, else dm_chat_id
    """
    integ = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.user_id == user_id,
            ChatIntegration.provider == "telegram",
        )
    ).first()
    if not integ:
        raise HTTPException(status_code=404, detail="Telegram integration not found")

    target = integ.group_target_id or integ.dm_chat_id
    if not target:
        raise HTTPException(status_code=400, detail="Missing target chat id (setgroup or link DM)")

    day_keys = last_n_local_date_keys(7, integ.timezone)

    rows = session.exec(
        select(StudySession).where(
            StudySession.user_id == user_id,
            StudySession.session_date.in_(day_keys),
        )
    ).all()

    total_cards = sum(int(r.cards_reviewed or 0) for r in rows)
    denom = sum(int(r.cards_reviewed or 0) for r in rows) or 0
    if denom > 0:
        avg_q = sum(float(r.avg_quality or 0) * int(r.cards_reviewed or 0) for r in rows) / denom
    else:
        avg_q = 0.0

    msg = (
        "🧪 Test Weekly report (7 ngày gần nhất)\n\n"
        f"- Tổng thẻ đã ôn: {total_cards}\n"
        f"- Điểm trung bình: {avg_q:.2f} / 3.00\n"
        f"- Khung thời gian: {day_keys[0]} → {day_keys[-1]}\n"
    )
    send_message_sync(chat_id=str(target), text=msg)
    return {"message": "sent", "target": str(target)}


@router.post("/due/test")
def test_send_due_cards(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    """
    Send 1-3 due cards immediately (debug):
    - uses Telegram integration for current user
    - sends to dm_chat_id (not group) to avoid spamming groups
    """
    integ = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.user_id == user_id,
            ChatIntegration.provider == "telegram",
        )
    ).first()
    if not integ:
        raise HTTPException(status_code=404, detail="Telegram integration not found")
    if not integ.dm_chat_id:
        raise HTTPException(status_code=400, detail="Missing dm_chat_id (DM bot /start then link again)")

    today = local_date_key(integ.timezone)
    due_rows = session.exec(
        select(Progress)
        .where(
            Progress.user_id == user_id,
            Progress.next_review.is_not(None),
            Progress.next_review <= today,
        )
        .order_by(Progress.next_review.asc(), Progress.ease_factor.asc(), Progress.id.asc())
        .limit(3)
    ).all()
    if not due_rows:
        raise HTTPException(status_code=404, detail="No due cards")

    sent = 0
    for due in due_rows:
        card = session.get(Flashcard, due.card_id)
        if not card:
            continue
        card_id = due.card_id
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": "0 Lại", "callback_data": f"rate:{card_id}:0"},
                    {"text": "1 Khó", "callback_data": f"rate:{card_id}:1"},
                ],
                [
                    {"text": "2 Tốt", "callback_data": f"rate:{card_id}:2"},
                    {"text": "3 Dễ", "callback_data": f"rate:{card_id}:3"},
                ],
            ]
        }
        send_message_sync(
            chat_id=str(integ.dm_chat_id),
            text=f"🧪 Test due card\n\nQ: {card.front}\n\nA: {card.back}\n\nChấm điểm để tiếp tục:",
            reply_markup=reply_markup,
        )
        sent += 1

    return {"message": "sent", "sent": sent}
