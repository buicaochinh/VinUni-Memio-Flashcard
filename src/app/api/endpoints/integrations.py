import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.models.domain import ChatIntegration, LinkCode
from src.app.schemas.integrations import LinkIntegrationRequest, LinkIntegrationResponse


router = APIRouter()


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

    if existing:
        existing.provider_user_id = link.provider_user_id
        session.add(existing)
    else:
        integ = ChatIntegration(
            user_id=user_id,
            provider=link.provider,
            provider_user_id=link.provider_user_id,
        )
        session.add(integ)

    link.consumed_at = now
    link.consumed_by_user_id = user_id
    session.add(link)
    session.commit()

    return {"message": "success", "provider": link.provider, "provider_user_id": link.provider_user_id}

