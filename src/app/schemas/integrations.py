from pydantic import BaseModel


class LinkIntegrationRequest(BaseModel):
    code: str


class LinkIntegrationResponse(BaseModel):
    message: str = "success"
    provider: str
    provider_user_id: str
