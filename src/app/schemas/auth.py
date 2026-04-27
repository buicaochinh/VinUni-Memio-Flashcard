from pydantic import BaseModel


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    message: str = "success"
    user: dict
    tokens: TokenPair


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    message: str = "success"
    tokens: TokenPair

