from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class IngestionSourceCreate(BaseModel):
    provider: str
    name: str
    source_url: Optional[str] = None
    target_deck_id: Optional[int] = None
    auto_tag: bool = True
    frequency_minutes: int = Field(default=360, ge=5, le=10080)
    cards_per_item: int = Field(default=6, ge=1, le=20)
    sync_mode: str = "one_way"
    config: dict[str, Any] = Field(default_factory=dict)


class IngestionSourceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    source_url: Optional[str] = None
    target_deck_id: Optional[int] = None
    auto_tag: Optional[bool] = None
    frequency_minutes: Optional[int] = Field(default=None, ge=5, le=10080)
    cards_per_item: Optional[int] = Field(default=None, ge=1, le=20)
    sync_mode: Optional[str] = None
    config: Optional[dict[str, Any]] = None


class IngestionSourceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: str
    name: str
    status: str
    sync_mode: str
    source_url: Optional[str] = None
    external_id: Optional[str] = None
    target_deck_id: Optional[int] = None
    auto_tag: bool
    frequency_minutes: int
    cards_per_item: int
    config: dict[str, Any] = Field(default_factory=dict)
    last_synced_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class IngestionItemPreview(BaseModel):
    title: str
    topic_tag: Optional[str] = None
    external_url: Optional[str] = None
    summary: Optional[str] = None


class IngestionRunItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_id: int
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    fetched_count: int
    normalized_count: int
    created_count: int
    error_message: Optional[str] = None


class IngestionSyncResponse(BaseModel):
    message: str = "success"
    source_id: int
    run_id: int
    fetched_count: int
    normalized_count: int
    created_count: int
    preview_cards: int = 0
