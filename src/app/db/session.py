from typing import Generator

from sqlmodel import create_engine, Session
from src.app.core.config import DATABASE_URL

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Please check your .env file.")

# Ensure postgresql:// prefix for SQLAlchemy
db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url, pool_pre_ping=True)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

# ---------------------------------------------------------------------
# Schema / Init
# ---------------------------------------------------------------------

def init_db():
    """
    Legacy init hook (kept to avoid breaking imports).

    This project now uses Alembic migrations; do not auto-create schema at runtime.
    Apply migrations with:
      alembic upgrade head
    """
    return
