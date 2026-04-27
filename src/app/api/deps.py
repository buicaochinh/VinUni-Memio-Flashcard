from fastapi import Depends, HTTPException, Request

from src.app.utils.jwt_auth import decode_token, get_bearer_token


def get_current_user_id(request: Request) -> int:
    token = get_bearer_token(request.headers.get("authorization"))
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        data = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if data.get("typ") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    try:
        uid = int(data.get("sub", "0") or 0)
    except Exception:
        uid = 0
    if uid <= 0:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return uid

