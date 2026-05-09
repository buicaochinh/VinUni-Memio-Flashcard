from pydantic import BaseModel
from typing import List, Dict, Optional

class ProgressUpdate(BaseModel):
    card_id: int
    quality: int
    ease_factor: float
    repetition: int
    interval: int
    deck_id: int = 0

class CardEdit(BaseModel):
    front: str
    back: str
    difficulty: str = "medium"
    source_context: Optional[str] = None

class BulkCreatePayload(BaseModel):
    cards: List[Dict]

class StudySessionLog(BaseModel):
    deck_id: int
    cards_reviewed: int
    avg_quality: float

class ExplainRequest(BaseModel):
    front: str
    back: str
    message: str
    source_context: Optional[str] = None
    history: List[Dict] = []
