from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class LinkIntegrationRequest(BaseModel):
    code: str


class LinkIntegrationResponse(BaseModel):
    message: str = "success"
    provider: str
    provider_user_id: str


class IntegrationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: str
    provider_user_id: str
    dm_chat_id: Optional[str] = None
    timezone: str
    send_window: str
    daily_goal: int
    created_at: datetime
    last_sent_at: Optional[datetime] = None


class UpdateIntegrationRequest(BaseModel):
    timezone: Optional[str] = None
    send_window: Optional[str] = Field(
        default=None,
        description="Format HH:MM-HH:MM (24h), ví dụ 19:00-22:00",
    )
    daily_goal: Optional[int] = Field(default=None, ge=1, le=500)
