from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.core.config import settings
from src.app.db.session import get_session
from src.app.services import notification_service
from src.app.services import evaluation_service

router = APIRouter()


@router.get("/me/notifications")
def get_my_notifications(
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    alerts = notification_service.get_user_alerts(session, user_id)
    evaluation_service.log_telemetry_event(
        session,
        user_id=user_id,
        event_type="notification_impression",
        target_type="in_app",
        metadata={"alert_types": [alert["type"] for alert in alerts], "count": len(alerts)},
    )
    return alerts


@router.post("/trigger")
async def trigger_notifications(
    request: Request,
    session: Session = Depends(get_session),
):
    """Cron endpoint — call with header X-Cron-Secret matching CRON_SECRET env var."""
    secret = request.headers.get("x-cron-secret", "")
    if settings.CRON_SECRET and secret != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    sent = await notification_service.send_due_notifications(session)
    return {"sent": sent}
