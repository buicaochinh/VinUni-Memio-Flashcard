from typing import Optional

from pydantic import BaseModel


class NotionConnectionStatus(BaseModel):
    connected: bool
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None
    workspace_icon: Optional[str] = None
    owner_type: Optional[str] = None


class NotionConnectResponse(BaseModel):
    connect_url: str


class NotionPageItem(BaseModel):
    id: str
    title: str
    url: Optional[str] = None
    last_edited_time: Optional[str] = None
    object_type: str = "page"

