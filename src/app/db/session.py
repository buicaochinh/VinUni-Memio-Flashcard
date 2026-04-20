import os
from pathlib import Path
from typing import Generator

from sqlmodel import create_engine, Session, SQLModel
from src.app.core.config import DATABASE_URL

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_NAME = DATA_DIR / "flashcards.db"

# Handle DATABASE_URL for SQLModel/SQLAlchemy
if not DATABASE_URL:
    sqlite_url = f"sqlite:///{DB_NAME}"
    connect_args = {"check_same_thread": False}
    engine = create_engine(sqlite_url, connect_args=connect_args)
else:
    # Ensure postgresql:// prefix for SQLAlchemy
    db_url = DATABASE_URL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    engine = create_engine(db_url)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

# ---------------------------------------------------------------------
# Schema / Init
# ---------------------------------------------------------------------

def init_db():
    """Initialize the database schema."""
    # Import models to ensure they are registered with SQLModel.metadata
    from src.app.models import domain
    
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(engine)
