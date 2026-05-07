from typing import Any, List, Optional
from pydantic import BaseModel


class CoachCitation(BaseModel):
    id: str
    label: str
    text: str
    source_type: str
    deck_id: Optional[int] = None
    card_id: Optional[int] = None
    url: Optional[str] = None


class CoachAction(BaseModel):
    type: str
    label: str
    href: Optional[str] = None
    payload: dict[str, Any] = {}
    requires_confirmation: bool = False


class CoachMessageRequest(BaseModel):
    user_id: int
    message: str
    thread_id: Optional[int] = None
    context_deck_id: Optional[int] = None
    mode: Optional[str] = None


class CoachMessageResponse(BaseModel):
    thread_id: int
    answer: str
    citations: List[CoachCitation] = []
    actions: List[CoachAction] = []


class CoachQuizStartRequest(BaseModel):
    user_id: int
    deck_id: Optional[int] = None
    count: int = 5


class CoachQuizQuestion(BaseModel):
    id: str
    card_id: int
    deck_id: int
    deck_name: str
    prompt: str
    choices: List[str]
    answer_index: int
    explanation: str
    difficulty: str = "medium"
    ease_factor: Optional[float] = None
    repetition: Optional[int] = None
    interval: Optional[int] = None


class CoachQuizStartResponse(BaseModel):
    questions: List[CoachQuizQuestion]


class CoachThreadSummary(BaseModel):
    id: int
    title: str
    context_deck_id: Optional[int] = None
    created_at: Any
    updated_at: Any


class CoachStoredMessage(BaseModel):
    id: int
    role: str
    content: str
    citations: List[CoachCitation] = []
    actions: List[CoachAction] = []
    created_at: Any
