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


class IngestionSource(SQLModel, table=True):
    __tablename__ = "ingestion_sources"
    __table_args__ = (
        Index("ix_ingestion_sources_user_provider", "user_id", "provider"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    provider: str  # "rss" | "notion" | "obsidian" | "roam"
    name: str
    status: str = "active"  # "active" | "paused"
    sync_mode: str = "one_way"  # "one_way" | "two_way"
    source_url: Optional[str] = None
    external_id: Optional[str] = None
    target_deck_id: Optional[int] = Field(default=None, foreign_key="decks.id")
    auto_tag: bool = True
    frequency_minutes: int = 360
    cards_per_item: int = 6
    config_json: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class IngestionItem(SQLModel, table=True):
    __tablename__ = "ingestion_items"
    __table_args__ = (
        UniqueConstraint("source_id", "checksum", name="uq_ingestion_items_source_checksum"),
        Index("ix_ingestion_items_source_created", "source_id", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="ingestion_sources.id", index=True)
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    title: str
    content_text: Optional[str] = None
    summary: Optional[str] = None
    topic_tag: Optional[str] = None
    checksum: str = Field(index=True)
    published_at: Optional[datetime] = None
    last_processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IngestionRun(SQLModel, table=True):
    __tablename__ = "ingestion_runs"
    __table_args__ = (
        Index("ix_ingestion_runs_source_started", "source_id", "started_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="ingestion_sources.id", index=True)
    status: str = "running"  # "running" | "success" | "failed"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    fetched_count: int = 0
    normalized_count: int = 0
    created_count: int = 0
    error_message: Optional[str] = None


class ExternalNote(SQLModel, table=True):
    __tablename__ = "external_notes"
    __table_args__ = (
        UniqueConstraint("source_id", "external_note_id", name="uq_external_notes_source_note"),
        Index("ix_external_notes_source_last_seen", "source_id", "last_seen_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="ingestion_sources.id", index=True)
    external_note_id: str
    parent_external_id: Optional[str] = None
    title: str
    note_type: str = "page"
    content_text: Optional[str] = None
    highlights_text: Optional[str] = None
    graph_refs_json: Optional[str] = None
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class IngestionCursor(SQLModel, table=True):
    __tablename__ = "ingestion_cursors"
    __table_args__ = (
        UniqueConstraint("source_id", name="uq_ingestion_cursors_source"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: int = Field(foreign_key="ingestion_sources.id", index=True)
    cursor_type: str = "timestamp"
    cursor_value: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OAuthConnection(SQLModel, table=True):
    __tablename__ = "oauth_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_oauth_connections_user_provider"),
        Index("ix_oauth_connections_provider", "provider"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    provider: str
    provider_user_id: Optional[str] = None
    access_token: str
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None
    workspace_icon: Optional[str] = None
    owner_type: Optional[str] = None
    capabilities_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class IngestionCardMap(SQLModel, table=True):
    __tablename__ = "ingestion_card_maps"
    __table_args__ = (
        UniqueConstraint("ingestion_item_id", "flashcard_id", name="uq_ingestion_card_maps_item_card"),
        Index("ix_ingestion_card_maps_item", "ingestion_item_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    ingestion_item_id: int = Field(foreign_key="ingestion_items.id", index=True)
    flashcard_id: int = Field(foreign_key="flashcards.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
