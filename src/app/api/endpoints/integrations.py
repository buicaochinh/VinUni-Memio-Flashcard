import datetime
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.models.domain import ChatIntegration, LinkCode
from src.app.schemas.integrations import (
    IntegrationItem,
    LinkIntegrationRequest,
    LinkIntegrationResponse,
    UpdateIntegrationRequest,
)


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

    now = datetime.datetime.utcnow()
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
        row.timezone = payload.timezone.strip() or row.timezone
    if payload.send_window is not None:
        sw = payload.send_window.strip()
        if not _SEND_WINDOW_RE.match(sw):
            raise HTTPException(status_code=400, detail="send_window must match HH:MM-HH:MM")
        row.send_window = sw
    if payload.daily_goal is not None:
        row.daily_goal = payload.daily_goal

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
