from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from src.app.core.config import settings
from src.app.models.domain import User
from src.app.utils.security import hash_password, verify_password, generate_guest_id


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    allowed = {
        item.strip().lower()
        for item in (settings.ADMIN_EMAILS or "").split(",")
        if item.strip()
    }
    return email.strip().lower() in allowed


def sync_admin_status(session: Session, user: User) -> bool:
    """Promote configured admin emails without demoting manual DB admins."""
    if user.is_admin:
        return False
    if not is_admin_email(user.email):
        return False
    user.is_admin = True
    session.add(user)
    return True

def get_or_create_user(session: Session, google_id: str, name: str, email: str, photo_url: str = ""):
    """Google OAuth login"""
    statement = select(User).where(User.google_id == google_id)
    user = session.exec(statement).first()

    if not user:
        user = User(
            google_id=google_id,
            name=name,
            email=email,
            photo_url=photo_url,
            auth_type="google",
            is_admin=is_admin_email(email),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.name = name
        user.email = email
        user.photo_url = photo_url
        sync_admin_status(session, user)
        session.add(user)
        session.commit()
        session.refresh(user)

    return user.model_dump(exclude={"password_hash"})

def register_user(session: Session, username: str, password: str, email: str = None, name: str = None):
    """Register a new user with username/password"""
    statement = select(User).where(User.username == username)
    existing = session.exec(statement).first()

    if existing:
        raise ValueError("Username already exists")

    user = User(
        username=username,
        password_hash=hash_password(password),
        email=email,
        name=name or username,
        auth_type="username",
        is_admin=is_admin_email(email),
    )
    session.add(user)
    try:
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise ValueError("Username already exists")

    return user.model_dump(exclude={"password_hash"})

def login_user(session: Session, username: str, password: str):
    """Login with username/password"""
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()

    if not user or not user.password_hash:
        raise ValueError("Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid username or password")

    if sync_admin_status(session, user):
        session.commit()
        session.refresh(user)

    return user.model_dump(exclude={"password_hash"})

def create_guest_user(session: Session, guest_name: str = "Guest User"):
    """Create a guest user session"""
    for _ in range(5):
        guest_username = generate_guest_id()
        statement = select(User).where(User.username == guest_username)
        existing = session.exec(statement).first()
        if existing:
            continue

        user = User(
            username=guest_username,
            name=guest_name,
            auth_type="guest",
            is_guest=True
        )
        session.add(user)
        try:
            session.commit()
            session.refresh(user)
            return user.model_dump(exclude={"password_hash"})
        except IntegrityError:
            session.rollback()
            continue

    raise ValueError("Could not create guest user")
