from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from src.app.api.deps import get_current_user_id
from src.app.core.time import default_timezone_name, validate_timezone
from src.app.db.session import get_session
from src.app.models.domain import UserSettings

router = APIRouter()

class UserSettingsUpdate(BaseModel):
    daily_new_limit: int
    daily_review_limit: int
    timezone: str | None = None


class UserTimezoneUpdate(BaseModel):
    timezone: str

@router.get("/me/settings")
def get_user_settings(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings:
        return {
            "daily_new_limit": 20,
            "daily_review_limit": 50,
            "timezone": default_timezone_name(),
        }
    return {
        "daily_new_limit": settings.daily_new_limit,
        "daily_review_limit": settings.daily_review_limit,
        "timezone": settings.timezone or default_timezone_name(),
    }

@router.put("/me/settings")
def update_user_settings(payload: UserSettingsUpdate, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    timezone_name = None
    if payload.timezone is not None:
        try:
            timezone_name = validate_timezone(payload.timezone)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings:
        settings = UserSettings(
            user_id=user_id,
            daily_new_limit=payload.daily_new_limit,
            daily_review_limit=payload.daily_review_limit,
            timezone=timezone_name or default_timezone_name(),
        )
    else:
        settings.daily_new_limit = payload.daily_new_limit
        settings.daily_review_limit = payload.daily_review_limit
        if timezone_name is not None:
            settings.timezone = timezone_name

    session.add(settings)
    session.commit()

    return {"message": "success"}


@router.patch("/me/settings/timezone")
def update_user_timezone(payload: UserTimezoneUpdate, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    try:
        timezone_name = validate_timezone(payload.timezone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings:
        settings = UserSettings(user_id=user_id, timezone=timezone_name)
    else:
        settings.timezone = timezone_name

    session.add(settings)
    session.commit()

    return {"message": "success", "timezone": timezone_name}
