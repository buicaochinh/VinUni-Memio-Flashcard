from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from src.app.db.session import get_session
from src.app.models.domain import UserSettings

router = APIRouter()

class UserSettingsUpdate(BaseModel):
    daily_new_limit: int
    daily_review_limit: int

@router.get("/{user_id}/settings")
def get_user_settings(user_id: int, session: Session = Depends(get_session)):
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings:
        return {"daily_new_limit": 20, "daily_review_limit": 50}
    return {
        "daily_new_limit": settings.daily_new_limit,
        "daily_review_limit": settings.daily_review_limit
    }

@router.put("/{user_id}/settings")
def update_user_settings(user_id: int, payload: UserSettingsUpdate, session: Session = Depends(get_session)):
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings:
        settings = UserSettings(
            user_id=user_id,
            daily_new_limit=payload.daily_new_limit,
            daily_review_limit=payload.daily_review_limit
        )
    else:
        settings.daily_new_limit = payload.daily_new_limit
        settings.daily_review_limit = payload.daily_review_limit
        
    session.add(settings)
    session.commit()
    
    return {"message": "success"}
