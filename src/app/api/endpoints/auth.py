from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.app.db.session import get_session
from src.app.services import user_service
from src.app.schemas.user import LoginRequest

router = APIRouter()

@router.post("/login")
def login(request: LoginRequest, session: Session = Depends(get_session)):
    user = user_service.get_or_create_user(
        session, request.google_id, request.name, request.email, request.photo_url
    )
    return {"message": "success", "user": user}
