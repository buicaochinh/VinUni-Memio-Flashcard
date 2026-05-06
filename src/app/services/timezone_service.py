from sqlmodel import Session, select

from src.app.core.time import default_timezone_name, validate_timezone
from src.app.models.domain import UserSettings


def get_user_timezone(session: Session, user_id: int) -> str:
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    if not settings or not settings.timezone:
        return default_timezone_name()
    try:
        return validate_timezone(settings.timezone)
    except ValueError:
        return default_timezone_name()
