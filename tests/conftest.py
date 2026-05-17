import os
import tempfile

# Set test environment variables BEFORE any src imports.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production-abc123xyz0987654321")
os.environ.setdefault("IMAGES_DATA_DIR", "/tmp/test-memio-images")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-fake-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-ant-test-fake-key")

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

# ── Database setup ────────────────────────────────────────────────────────────
# File-based SQLite so the same file is used by every connection in this process.
_TEST_DB_FILE = os.path.join(tempfile.gettempdir(), "pytest_memio_test.db")
_TEST_ENGINE = create_engine(
    f"sqlite:///{_TEST_DB_FILE}",
    connect_args={"check_same_thread": False},
)

# Register all domain models with SQLModel.metadata at import time.
import src.app.models.domain  # noqa: F401

# Create schema once when conftest is first imported (before any fixture runs).
# drop_all first to handle stale files from interrupted previous runs.
SQLModel.metadata.drop_all(_TEST_ENGINE)
SQLModel.metadata.create_all(_TEST_ENGINE)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    """Delete all rows after each test so the next one starts clean."""
    yield
    with _TEST_ENGINE.connect() as conn:
        for table in reversed(SQLModel.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture
def db_session():
    with Session(_TEST_ENGINE) as session:
        yield session


@pytest.fixture
def client(db_session):
    """FastAPI TestClient that overrides get_session to use the test DB.

    Not used as a context manager so APScheduler lifespan is not triggered.
    """
    from src.main import app
    from src.app.db.session import get_session

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session
    yield TestClient(app, raise_server_exceptions=True)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create and return a test user (dict without password_hash)."""
    from src.app.services.user_service import register_user
    return register_user(db_session, "testuser", "testpass123", "test@example.com", "Test User")


@pytest.fixture
def auth_headers(test_user):
    """Return Authorization headers for the test user."""
    from src.app.utils.jwt_auth import create_access_token
    token = create_access_token(user_id=test_user["id"])
    return {"Authorization": f"Bearer {token}"}
