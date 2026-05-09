from typing import Any, List, Optional
from pydantic import BaseModel


class CoachCitation(BaseModel):
    id: str
    label: str
    text: str
    source_type: str
    source_label: Optional[str] = None
    priority: int = 0
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
    card_ids: Optional[List[int]] = None
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


class CoachWeakConceptCard(BaseModel):
    id: int
    front: str
    deck_id: int
    deck_name: str
    weakness_score: int
    last_quality: Optional[int] = None
    ease_factor: Optional[float] = None


class CoachWeakConceptCluster(BaseModel):
    id: str
    label: str
    deck_id: int
    deck_name: str
    card_ids: List[int]
    card_count: int
    mastery_score: int
    weakness_score: int
    reason: str
    sample_cards: List[CoachWeakConceptCard]


class CoachLearningIntelligenceResponse(BaseModel):
    clusters: List[CoachWeakConceptCluster]
    total_weak_cards: int


class CoachQuizSummaryRequest(BaseModel):
    user_id: int
    summary: str
    thread_id: Optional[int] = None
    context_deck_id: Optional[int] = None
    actions: List[CoachAction] = []


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


class CoachQuizSummaryResponse(BaseModel):
    thread_id: int
    message: CoachStoredMessage


class CoachTrustEventRequest(BaseModel):
    user_id: int
    thread_id: Optional[int] = None
    message_id: Optional[int] = None
    event_type: str
    citation_id: Optional[str] = None
    value: Optional[str] = None
    source_type: Optional[str] = None
