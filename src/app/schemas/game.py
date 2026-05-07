from typing import Any, List, Optional
from pydantic import BaseModel


class GameStartRequest(BaseModel):
    user_id: int
    card_count: int = 12


class GameQuestion(BaseModel):
    id: str
    card_id: int
    stage_id: str
    prompt: str
    choices: List[str]
    answer_index: int
    hint: str
    explanation: str
    difficulty: str = "medium"


class GameStage(BaseModel):
    id: str
    title: str
    mission: str
    questions: List[GameQuestion]


class GameCampaign(BaseModel):
    title: str
    premise: str
    final_goal: str
    stages: List[GameStage]


class GameStartResponse(BaseModel):
    session_id: int
    campaign: GameCampaign


class GameCompleteRequest(BaseModel):
    user_id: int
    score: int
    xp_earned: int
    accuracy: float
    total_questions: int
    correct_answers: int


class GameCompleteResponse(BaseModel):
    session_id: int
    status: str
    score: int
    xp_earned: int
    accuracy: float


class GameSessionSummary(BaseModel):
    id: int
    deck_id: int
    mode: str
    status: str
    score: int
    xp_earned: int
    accuracy: float
    total_questions: int
    correct_answers: int
    created_at: Any
    completed_at: Optional[Any] = None
