from pydantic import BaseModel

class LoginRequest(BaseModel):
    google_id: str
    name: str
    email: str
    photo_url: str = ""
