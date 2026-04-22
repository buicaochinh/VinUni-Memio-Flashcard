from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class GoogleLoginRequest(BaseModel):
    google_id: str
    name: str
    email: str
    photo_url: str = ""

class UsernameLoginRequest(BaseModel):
    username: str
    password: str

class UsernameRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class GuestLoginRequest(BaseModel):
    guest_name: Optional[str] = "Guest User"

class UserResponse(BaseModel):
    id: int
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    auth_type: str
    is_guest: bool

# Keep for backward compatibility
LoginRequest = GoogleLoginRequest
