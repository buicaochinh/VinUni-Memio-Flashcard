from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from src.app.db.session import get_session
from src.app.services import user_service
from src.app.schemas.user import (
    GoogleLoginRequest,
    UsernameLoginRequest,
    UsernameRegisterRequest,
    GuestLoginRequest,
    UserResponse,
)

router = APIRouter()

@router.post("/login/google")
def login_google(request: GoogleLoginRequest, session: Session = Depends(get_session)):
    """Google OAuth login"""
    user = user_service.get_or_create_user(
        session, request.google_id, request.name, request.email, request.photo_url
    )
    return {"message": "success", "user": user}

@router.post("/register")
def register(request: UsernameRegisterRequest, session: Session = Depends(get_session)):
    """Register a new user with username/password"""
    try:
        user = user_service.register_user(
            session, request.username, request.password, request.email, request.name
        )
        return {"message": "success", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login/username")
def login_username(request: UsernameLoginRequest, session: Session = Depends(get_session)):
    """Login with username/password"""
    try:
        user = user_service.login_user(session, request.username, request.password)
        return {"message": "success", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/login/guest")
def login_guest(request: GuestLoginRequest, session: Session = Depends(get_session)):
    """Create a guest user session"""
    user = user_service.create_guest_user(session, request.guest_name)
    return {"message": "success", "user": user}

# Keep backward compatibility
@router.post("/login")
def login(request: GoogleLoginRequest, session: Session = Depends(get_session)):
    """Backward compatible Google login endpoint"""
    return login_google(request, session)
