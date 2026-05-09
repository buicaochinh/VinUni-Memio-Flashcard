from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.schemas.goal import (
    LearningGoalDeleteResponse,
    LearningGoalsListResponse,
    LearningGoalResponse,
    LearningGoalUpsert,
    NotificationStrategyResponse,
)
from src.app.services import goal_service

router = APIRouter()


@router.get("/", response_model=LearningGoalsListResponse)
def list_learning_goals(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    return {"goals": goal_service.list_goals(session, user_id)}


@router.post("/", response_model=LearningGoalResponse)
def upsert_learning_goal(payload: LearningGoalUpsert, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    try:
        return goal_service.upsert_goal(
            session,
            user_id,
            payload.deck_id,
            payload.target_date,
            payload.desired_mastery,
            payload.daily_workload,
        )
    except ValueError as exc:
        if str(exc) == "DECK_NOT_FOUND":
            raise HTTPException(status_code=404, detail="Không tìm thấy deck.") from exc
        raise HTTPException(status_code=422, detail="Ngày mục tiêu không hợp lệ.") from exc


@router.delete("/{goal_id}", response_model=LearningGoalDeleteResponse)
def delete_learning_goal(goal_id: int, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    deleted_id = goal_service.delete_goal(session, user_id, goal_id)
    if deleted_id is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục tiêu học.")
    return {"message": "success", "deleted_id": deleted_id}


@router.get("/notification-strategy", response_model=NotificationStrategyResponse)
def get_notification_strategy():
    return goal_service.notification_strategy()
