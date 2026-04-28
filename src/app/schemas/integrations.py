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
    group_target_id: Optional[str] = None
    timezone: str
    send_window: str
    daily_goal: int
    created_at: datetime
    last_sent_at: Optional[datetime] = None
    sent_today: int = 0
    sent_today_date: Optional[str] = None
    weekly_report_week: Optional[str] = None
    weekly_report_sent_at: Optional[datetime] = None


class UpdateIntegrationRequest(BaseModel):
    timezone: Optional[str] = None
    send_window: Optional[str] = Field(
        default=None,
        description="Format HH:MM-HH:MM (24h), ví dụ 19:00-22:00",
    )
    daily_goal: Optional[int] = Field(default=None, ge=1, le=500)
    group_target_id: Optional[str] = Field(
        default=None,
        description="Telegram group chat id (ví dụ -100xxxxxxxxxx). Nếu null/empty: tắt gửi report vào nhóm.",
    )
