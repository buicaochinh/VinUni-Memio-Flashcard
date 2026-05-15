from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.app.api.deps import require_admin_user
from src.app.db.session import get_session
from src.app.services import evaluation_service

router = APIRouter()


@router.get("/evaluation/pilot")
def get_admin_pilot_evaluation(
    days: int = 7,
    _admin=Depends(require_admin_user),
    session: Session = Depends(get_session),
):
    return evaluation_service.get_pilot_evaluation(session, days=max(7, min(days, 30)))
