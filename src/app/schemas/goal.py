from typing import Any, Optional

from pydantic import BaseModel, Field


class LearningGoalUpsert(BaseModel):
    user_id: int
    deck_id: int
    target_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    desired_mastery: int = Field(default=85, ge=50, le=100)
    daily_workload: int = Field(default=20, ge=5, le=200)


class LearningGoalResponse(BaseModel):
    id: int
    user_id: int
    deck_id: int
    deck_name: str
    goal_type: str
    target_date: str
    desired_mastery: int
    daily_workload: int
    status: str
    days_remaining: int
    due_cards: int
    new_cards: int
    weak_cards: int
    total_cards: int
    workload_cards: int
    recommended_daily_cards: int
    readiness_score: int
    urgency: str
    plan_summary: str
    created_at: Any
    updated_at: Any


class LearningGoalsListResponse(BaseModel):
    goals: list[LearningGoalResponse]


class NotificationStrategyResponse(BaseModel):
    channels: list[str]
    preferences: dict[str, Any]
    triggers: list[dict[str, Any]]
    status: str


class LearningGoalDeleteResponse(BaseModel):
    message: str
    deleted_id: Optional[int] = None
