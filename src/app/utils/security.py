import base64
import hashlib
import bcrypt
import secrets
import string

BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"


def _bcrypt_sha256_secret(password: str) -> bytes:
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest)

def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_bcrypt_sha256_secret(password), bcrypt.gensalt())
    return f"{BCRYPT_SHA256_PREFIX}{hashed.decode('utf-8')}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith(BCRYPT_SHA256_PREFIX):
            stored_hash = hashed_password.removeprefix(BCRYPT_SHA256_PREFIX).encode("utf-8")
            return bcrypt.checkpw(_bcrypt_sha256_secret(plain_password), stored_hash)

        # Backward compatibility for existing plain bcrypt hashes.
        password_bytes = plain_password.encode("utf-8")
        if len(password_bytes) > 72:
            return False
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except (TypeError, ValueError):
        return False

def generate_guest_id() -> str:
    """Generate a unique guest identifier"""
    chars = string.ascii_letters + string.digits
    return "guest_" + "".join(secrets.choice(chars) for _ in range(12))
