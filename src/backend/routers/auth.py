from fastapi import APIRouter
from pydantic import BaseModel

from src import database as db

router = APIRouter()


class LoginRequest(BaseModel):
    google_id: str
    name: str
    email: str
    photo_url: str = ""


@router.post("/login")
def login(request: LoginRequest):
    user = db.get_or_create_user(
        request.google_id, request.name, request.email, request.photo_url
    )
    return {"message": "success", "user": user}
