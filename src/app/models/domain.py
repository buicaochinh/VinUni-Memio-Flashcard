from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint
from datetime import datetime

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    google_id: str = Field(unique=True, index=True)
    name: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None

    decks: List["Deck"] = Relationship(back_populates="user")

class Deck(SQLModel, table=True):
    __tablename__ = "decks"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    name: str
    description: str = ""
    is_public: int = 0
    share_token: Optional[str] = Field(default=None, unique=True)
    created_at: datetime = Field(default_factory=datetime.now)

    user: Optional[User] = Relationship(back_populates="decks")
    flashcards: List["Flashcard"] = Relationship(back_populates="deck")

class Flashcard(SQLModel, table=True):
    __tablename__ = "flashcards"
    id: Optional[int] = Field(default=None, primary_key=True)
    deck_id: int = Field(foreign_key="decks.id")
    front: str
    back: str
    difficulty: str = "medium"
    source_context: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    deck: Optional[Deck] = Relationship(back_populates="flashcards")
    progress: List["Progress"] = Relationship(back_populates="flashcard")

class Progress(SQLModel, table=True):
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "card_id", name="unique_user_card_progress"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    card_id: int = Field(foreign_key="flashcards.id")
    interval: int = 0
    repetition: int = 0
    ease_factor: float = 2.5
    last_quality: int = -1
    last_reviewed: Optional[str] = None
    next_review: Optional[str] = None

    flashcard: Optional[Flashcard] = Relationship(back_populates="progress")

class StudySession(SQLModel, table=True):
    __tablename__ = "study_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "deck_id", "session_date", name="unique_study_session_per_day"),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    deck_id: int = Field(foreign_key="decks.id")
    session_date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    cards_reviewed: int = 0
    avg_quality: float = 0
