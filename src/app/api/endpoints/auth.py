import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.app.db.session import get_session
from src.app.models.domain import AuthSession
from src.app.services import user_service
from src.app.schemas.auth import LoginResponse, RefreshRequest, RefreshResponse
from src.app.schemas.user import (
    GoogleLoginRequest,
    UsernameLoginRequest,
    UsernameRegisterRequest,
    UserResponse,
)
from src.app.utils.jwt_auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
)

router = APIRouter()

@router.post("/login/google")
def login_google(request: GoogleLoginRequest, session: Session = Depends(get_session)):
    """Google OAuth login"""
    user = user_service.get_or_create_user(
        session, request.google_id, request.name, request.email, request.photo_url
    )
    return {"message": "success", "user": user}

@router.post("/session/login/google", response_model=LoginResponse)
def login_google_session(request: GoogleLoginRequest, session: Session = Depends(get_session)):
    user = user_service.get_or_create_user(
        session, request.google_id, request.name, request.email, request.photo_url
    )
    auth_sess = AuthSession(user_id=int(user["id"]), refresh_token_hash="pending")
    session.add(auth_sess)
    session.commit()
    session.refresh(auth_sess)

    refresh_token = create_refresh_token(session_id=auth_sess.id, user_id=int(user["id"]))
    auth_sess.refresh_token_hash = hash_refresh_token(refresh_token)
    auth_sess.last_used_at = datetime.datetime.utcnow()
    session.add(auth_sess)
    session.commit()

    access_token = create_access_token(user_id=int(user["id"]))
    return {"message": "success", "user": user, "tokens": {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}}

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

@router.post("/session/login/username", response_model=LoginResponse)
def login_username_session(request: UsernameLoginRequest, session: Session = Depends(get_session)):
    try:
        user = user_service.login_user(session, request.username, request.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    auth_sess = AuthSession(user_id=int(user["id"]), refresh_token_hash="pending")
    session.add(auth_sess)
    session.commit()
    session.refresh(auth_sess)

    refresh_token = create_refresh_token(session_id=auth_sess.id, user_id=int(user["id"]))
    auth_sess.refresh_token_hash = hash_refresh_token(refresh_token)
    auth_sess.last_used_at = datetime.datetime.utcnow()
    session.add(auth_sess)
    session.commit()

    access_token = create_access_token(user_id=int(user["id"]))
    return {"message": "success", "user": user, "tokens": {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}}

@router.post("/session/refresh", response_model=RefreshResponse)
def refresh_session(payload: RefreshRequest, session: Session = Depends(get_session)):
    try:
        data = decode_token(payload.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if data.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token type")

    sid = int(data.get("sid", "0") or 0)
    uid = int(data.get("sub", "0") or 0)
    if sid <= 0 or uid <= 0:
        raise HTTPException(status_code=401, detail="Invalid refresh token payload")

    auth_sess = session.exec(select(AuthSession).where(AuthSession.id == sid, AuthSession.user_id == uid)).first()
    if not auth_sess or auth_sess.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Session revoked")

    if auth_sess.refresh_token_hash != hash_refresh_token(payload.refresh_token):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    auth_sess.last_used_at = datetime.datetime.utcnow()
    session.add(auth_sess)
    session.commit()

    access_token = create_access_token(user_id=uid)
    # Keep same refresh token for now (rotation comes in Phase 3 polish)
    return {"message": "success", "tokens": {"access_token": access_token, "refresh_token": payload.refresh_token, "token_type": "bearer"}}

# Keep backward compatibility
@router.post("/login")
def login(request: GoogleLoginRequest, session: Session = Depends(get_session)):
    """Backward compatible Google login endpoint"""
    return login_google(request, session)
