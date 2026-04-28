from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, UniqueConstraint, Index
from datetime import datetime


class AuthSession(SQLModel, table=True):
    """
    Refresh-session store (hash only).

    Note: No migration tool (Alembic) in this repo. Keep schema minimal.
    """

    __tablename__ = "auth_sessions"
    __table_args__ = (Index("ix_auth_sessions_revoked_at", "revoked_at"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    refresh_token_hash: str
    device_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = Field(default=None, index=True)


class ChatIntegration(SQLModel, table=True):
    __tablename__ = "chat_integrations"
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="unique_provider_user"),
        UniqueConstraint("user_id", "provider", name="unique_user_provider"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    provider: str  # "telegram" | "discord"
    provider_user_id: str  # telegram user id, discord user id

    dm_chat_id: Optional[str] = None  # telegram chat id; discord DM channel id (if applicable)
    group_target_id: Optional[str] = None  # telegram group chat id; discord channel id

    timezone: str = "Asia/Ho_Chi_Minh"
    send_window: str = "19:00-22:00"  # local time window
    daily_goal: int = 20

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_sent_at: Optional[datetime] = None
    sent_today: int = 0
    sent_today_date: Optional[str] = None  # local YYYY-MM-DD (based on timezone)
    weekly_report_week: Optional[str] = None  # ISO week key: YYYY-WW
    weekly_report_sent_at: Optional[datetime] = None


class LinkCode(SQLModel, table=True):
    __tablename__ = "link_codes"
    __table_args__ = (
        UniqueConstraint("code", name="unique_link_code"),
        Index("ix_link_codes_expires_at", "expires_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    provider: str  # "telegram" | "discord"
    provider_user_id: str
    dm_chat_id: Optional[str] = None  # Telegram chat id when linking (for worker sendMessage)
    expires_at: datetime
    consumed_at: Optional[datetime] = None
    consumed_by_user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    google_id: Optional[str] = Field(default=None, unique=True, index=True)
    username: Optional[str] = Field(default=None, unique=True, index=True)
    password_hash: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    auth_type: str = Field(default="google")  # "google", "username", "guest"
    is_guest: bool = Field(default=False)

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
