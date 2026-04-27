import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

from src.app.core.config import JWT_ACCESS_TOKEN_MINUTES, JWT_REFRESH_TOKEN_DAYS, JWT_SECRET


class AuthConfigError(RuntimeError):
    pass


def _require_secret() -> str:
    if not JWT_SECRET:
        raise AuthConfigError("JWT_SECRET is not set")
    return JWT_SECRET


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(*, user_id: int) -> str:
    secret = _require_secret()
    now = _now_utc()
    exp = now + timedelta(minutes=JWT_ACCESS_TOKEN_MINUTES)
    payload = {
        "typ": "access",
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_refresh_token(*, session_id: int, user_id: int) -> str:
    secret = _require_secret()
    now = _now_utc()
    exp = now + timedelta(days=JWT_REFRESH_TOKEN_DAYS)
    payload = {
        "typ": "refresh",
        "sid": str(session_id),
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    secret = _require_secret()
    return jwt.decode(token, secret, algorithms=["HS256"])


def hash_refresh_token(token: str) -> str:
    # Store only a hash in DB.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_link_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]

