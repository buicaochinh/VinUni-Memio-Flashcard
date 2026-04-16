import datetime
import secrets
import sqlite3
import os
from pathlib import Path

try:
    import psycopg2
    from psycopg2 import extras
except ImportError:
    psycopg2 = None

from src.config import DATABASE_URL

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_NAME = DATA_DIR / "flashcards.db"


# ---------------------------------------------------------------------
# DB helpers (RUNTIME‑SAFE)
# ---------------------------------------------------------------------

def is_postgres() -> bool:
    """Check if we are using PostgreSQL based on DATABASE_URL."""
    if not DATABASE_URL:
        return False
    return DATABASE_URL.startswith(("postgresql://", "postgres://"))


def placeholder() -> str:
    """Return the correct placeholder for the current database engine."""
    return "%s" if is_postgres() else "?"


def get_connection():
    """Create a connection to the correct database engine."""
    if is_postgres():
        if not psycopg2:
            raise ImportError(
                "psycopg2-binary is required for PostgreSQL. Run: pip install psycopg2-binary"
            )
        return psycopg2.connect(DATABASE_URL)
    else:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        return conn


def get_cursor(conn):
    """Create a cursor with the correct factory for the engine."""
    if is_postgres():
        return conn.cursor(cursor_factory=extras.DictCursor)
    return conn.cursor()


# ---------------------------------------------------------------------
# Schema / Init
# ---------------------------------------------------------------------

def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = get_cursor(conn)

    id_type = "SERIAL PRIMARY KEY" if is_postgres() else "INTEGER PRIMARY KEY AUTOINCREMENT"
    
    # We use a helper to log creation
    def execute_create(name, sql):
        # logger or print for debug
        # print(f"Creating table {name}...")
        cursor.execute(sql)

    execute_create("users", f"""
        CREATE TABLE IF NOT EXISTS users (
            id {id_type},
            google_id TEXT UNIQUE,
            name TEXT,
            email TEXT,
            photo_url TEXT
        )
    """)

    execute_create("decks", f"""
        CREATE TABLE IF NOT EXISTS decks (
            id {id_type},
            user_id INTEGER,
            name TEXT,
            description TEXT DEFAULT '',
            is_public INTEGER DEFAULT 0,
            share_token TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    execute_create("flashcards", f"""
        CREATE TABLE IF NOT EXISTS flashcards (
            id {id_type},
            deck_id INTEGER,
            front TEXT,
            back TEXT,
            difficulty TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    execute_create("progress", f"""
        CREATE TABLE IF NOT EXISTS progress (
            id {id_type},
            user_id INTEGER,
            card_id INTEGER,
            interval INTEGER DEFAULT 0,
            repetition INTEGER DEFAULT 0,
            ease_factor REAL DEFAULT 2.5,
            last_quality INTEGER DEFAULT -1,
            last_reviewed TEXT,
            next_review TEXT,
            UNIQUE(user_id, card_id)
        )
    """)

    execute_create("study_sessions", f"""
        CREATE TABLE IF NOT EXISTS study_sessions (
            id {id_type},
            user_id INTEGER,
            deck_id INTEGER,
            session_date TEXT DEFAULT CURRENT_DATE,
            cards_reviewed INTEGER DEFAULT 0,
            avg_quality REAL DEFAULT 0,
            UNIQUE(user_id, deck_id, session_date)
        )
    """)

    _safe_migrations(cursor)

    conn.commit()
    conn.close()


def _safe_migrations(cursor):
    """Safely apply migrations (add columns) to existing tables."""
    # (Using simpler format for better compatibility)
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT",
        "ALTER TABLE decks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
        "ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_public INTEGER DEFAULT 0",
        "ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_token TEXT",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'",
        "ALTER TABLE progress ADD COLUMN IF NOT EXISTS last_quality INTEGER DEFAULT -1",
    ]
    for sql in migrations:
        try:
            # Postgres supports ADD COLUMN IF NOT EXISTS in newer versions, 
            # SQLite doesn't, so we still wrap in try/except.
            cursor.execute(sql)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_or_create_user(google_id, name, email, photo_url=""):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"SELECT * FROM users WHERE google_id = {placeholder()}",
        (google_id,),
    )
    user = cur.fetchone()

    if not user:
        cur.execute(
            f"""
            INSERT INTO users (google_id, name, email, photo_url)
            VALUES ({placeholder()}, {placeholder()}, {placeholder()}, {placeholder()})
            """,
            (google_id, name, email, photo_url),
        )
        conn.commit()
        cur.execute(
            f"SELECT * FROM users WHERE google_id = {placeholder()}",
            (google_id,),
        )
        user = cur.fetchone()
    else:
        cur.execute(
            f"""
            UPDATE users
            SET name={placeholder()}, email={placeholder()}, photo_url={placeholder()}
            WHERE google_id={placeholder()}
            """,
            (name, email, photo_url, google_id),
        )
        conn.commit()

    conn.close()
    return dict(user) if user else None


# ---------------------------------------------------------------------------
# Decks
# ---------------------------------------------------------------------------

def create_deck(user_id, name, description=""):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"""
        INSERT INTO decks (user_id, name, description)
        VALUES ({placeholder()}, {placeholder()}, {placeholder()})
        """,
        (user_id, name, description),
    )
    conn.commit()

    if is_postgres():
        cur.execute("SELECT LASTVAL()")
        deck_id = cur.fetchone()[0]
    else:
        deck_id = cur.lastrowid

    conn.close()
    return deck_id


def get_user_decks(user_id):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"""
        SELECT * FROM decks
        WHERE user_id={placeholder()}
        ORDER BY created_at DESC
        """,
        (user_id,),
    )
    decks = cur.fetchall()
    conn.close()
    return [dict(d) for d in decks]


def get_deck_by_id(deck_id):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"SELECT * FROM decks WHERE id={placeholder()}",
        (deck_id,),
    )
    deck = cur.fetchone()
    conn.close()
    return dict(deck) if deck else None


def get_deck_by_share_token(token):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"SELECT * FROM decks WHERE share_token = {placeholder()} AND is_public = 1",
        (token,),
    )
    deck = cur.fetchone()
    conn.close()
    return dict(deck) if deck else None


def enable_deck_sharing(deck_id):
    token = secrets.token_urlsafe(8)
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"""
        UPDATE decks
        SET is_public=1, share_token={placeholder()}
        WHERE id={placeholder()}
        """,
        (token, deck_id),
    )
    conn.commit()
    conn.close()
    return token


def disable_deck_sharing(deck_id):
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(f"UPDATE decks SET is_public=0 WHERE id={placeholder()}", (deck_id,))
    conn.commit()
    conn.close()


def delete_deck(deck_id):
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(f"DELETE FROM flashcards WHERE deck_id={placeholder()}", (deck_id,))
    cur.execute(f"DELETE FROM decks WHERE id={placeholder()}", (deck_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Flashcards
# ---------------------------------------------------------------------------

def add_flashcard(deck_id, front, back, difficulty="medium"):
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(
        f"INSERT INTO flashcards (deck_id, front, back, difficulty) VALUES ({placeholder()}, {placeholder()}, {placeholder()}, {placeholder()})",
        (deck_id, front, back, difficulty),
    )
    conn.commit()
    if is_postgres():
        cur.execute("SELECT LASTVAL()")
        card_id = cur.fetchone()[0]
    else:
        card_id = cur.lastrowid
    conn.close()
    return card_id


def bulk_add_flashcards(deck_id, cards):
    """cards: list of dicts with front, back, difficulty keys"""
    conn = get_connection()
    cur = get_cursor(conn)
    for card in cards:
        cur.execute(
            f"INSERT INTO flashcards (deck_id, front, back, difficulty) VALUES ({placeholder()}, {placeholder()}, {placeholder()}, {placeholder()})",
            (deck_id, card["front"], card["back"], card.get("difficulty", "medium")),
        )
    conn.commit()
    conn.close()


def update_flashcard(card_id, front, back, difficulty=None):
    conn = get_connection()
    cur = get_cursor(conn)
    if difficulty:
        cur.execute(
            f"UPDATE flashcards SET front={placeholder()}, back={placeholder()}, difficulty={placeholder()} WHERE id={placeholder()}",
            (front, back, difficulty, card_id),
        )
    else:
        cur.execute(
            f"UPDATE flashcards SET front={placeholder()}, back={placeholder()} WHERE id={placeholder()}",
            (front, back, card_id),
        )
    conn.commit()
    conn.close()


def delete_flashcard(card_id):
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(f"DELETE FROM progress WHERE card_id={placeholder()}", (card_id,))
    cur.execute(f"DELETE FROM flashcards WHERE id={placeholder()}", (card_id,))
    conn.commit()
    conn.close()


def get_deck_cards(deck_id, user_id):
    conn = get_connection()
    cur = get_cursor(conn)
    query = f"""
    SELECT f.*, p.interval, p.repetition, p.ease_factor, p.last_quality,
           p.last_reviewed, p.next_review
    FROM flashcards f
    LEFT JOIN progress p ON f.id = p.card_id AND p.user_id = {placeholder()}
    WHERE f.deck_id = {placeholder()}
    ORDER BY f.created_at ASC
    """
    cur.execute(query, (user_id, deck_id))
    cards = cur.fetchall()
    conn.close()
    return [dict(card) for card in cards]


def get_public_deck_cards(deck_id):
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(f"SELECT * FROM flashcards WHERE deck_id={placeholder()} ORDER BY created_at ASC", (deck_id,))
    cards = cur.fetchall()
    conn.close()
    return [dict(c) for c in cards]


# ---------------------------------------------------------------------------
# Progress / SM-2
# ---------------------------------------------------------------------------

def update_card_progress(user_id, card_id, interval, repetition, ease_factor, quality=-1):
    conn = get_connection()
    cur = get_cursor(conn)
    last_reviewed = datetime.datetime.now().strftime("%Y-%m-%d")
    next_review = (
        datetime.datetime.now() + datetime.timedelta(days=interval)
    ).strftime("%Y-%m-%d")

    cur.execute(
        f"""
        INSERT INTO progress (user_id, card_id, interval, repetition, ease_factor,
                              last_quality, last_reviewed, next_review)
        VALUES ({placeholder()}, {placeholder()}, {placeholder()}, {placeholder()}, {placeholder()}, {placeholder()}, {placeholder()}, {placeholder()})
        ON CONFLICT(user_id, card_id) DO UPDATE SET
            interval = EXCLUDED.interval,
            repetition = EXCLUDED.repetition,
            ease_factor = EXCLUDED.ease_factor,
            last_quality = EXCLUDED.last_quality,
            last_reviewed = EXCLUDED.last_reviewed,
            next_review = EXCLUDED.next_review
        """,
        (user_id, card_id, interval, repetition, ease_factor, quality, last_reviewed, next_review),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Study sessions (for heatmap & streak)
# ---------------------------------------------------------------------------

def log_study_session(user_id, deck_id, cards_reviewed, avg_quality):
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    conn = get_connection()
    cur = get_cursor(conn)
    cur.execute(
        f"""
        INSERT INTO study_sessions (user_id, deck_id, session_date, cards_reviewed, avg_quality)
        VALUES ({placeholder()}, {placeholder()}, {placeholder()}, {placeholder()}, {placeholder()})
        ON CONFLICT(user_id, deck_id, session_date) DO UPDATE SET
            cards_reviewed = study_sessions.cards_reviewed + EXCLUDED.cards_reviewed,
            avg_quality = (study_sessions.avg_quality + EXCLUDED.avg_quality) / 2
        """,
        (user_id, deck_id, today, cards_reviewed, avg_quality),
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def get_analytics(user_id):
    conn = get_connection()
    cur = get_cursor(conn)

    cur.execute(
        f"""
        SELECT DISTINCT session_date FROM study_sessions
        WHERE user_id = {placeholder()} ORDER BY session_date DESC
        """,
        (user_id,),
    )
    dates = [row["session_date"] for row in cur.fetchall()]
    streak = _calculate_streak(dates)

    since_date = (datetime.datetime.now() - datetime.timedelta(days=35)).strftime("%Y-%m-%d")
    
    cur.execute(
        f"""
        SELECT session_date, SUM(cards_reviewed) as total
        FROM study_sessions WHERE user_id = {placeholder()}
        AND session_date >= {placeholder()}
        GROUP BY session_date
        """,
        (user_id, since_date),
    )
    heatmap = {row["session_date"]: row["total"] for row in cur.fetchall()}

    cur.execute(
        f"""
        SELECT f.front, f.back, f.difficulty, p.ease_factor, p.repetition,
               p.last_quality, f.deck_id
        FROM progress p
        JOIN flashcards f ON p.card_id = f.id
        WHERE p.user_id = {placeholder()} AND p.repetition > 0
        ORDER BY p.ease_factor ASC
        LIMIT 10
        """,
        (user_id,),
    )
    hardest_cards = [dict(row) for row in cur.fetchall()]

    cur.execute(
        f"SELECT COUNT(*) as total FROM progress WHERE user_id={placeholder()} AND repetition > 0",
        (user_id,),
    )
    total_reviewed = cur.fetchone()["total"]

    cur.execute(
        f"SELECT COUNT(*) as hard FROM progress WHERE user_id={placeholder()} AND ease_factor < 2.0",
        (user_id,),
    )
    hard_count = cur.fetchone()["hard"]

    forgetting_rate = round((hard_count / total_reviewed * 100) if total_reviewed > 0 else 0, 1)

    cur.execute(
        f"""
        SELECT d.name, d.id,
               AVG(p.ease_factor) as avg_ef,
               COUNT(p.id) as reviewed_count,
               SUM(CASE WHEN p.ease_factor < 2.0 THEN 1 ELSE 0 END) as hard_count
        FROM progress p
        JOIN flashcards f ON p.card_id = f.id
        JOIN decks d ON f.deck_id = d.id
        WHERE p.user_id = {placeholder()} AND p.repetition > 0
        GROUP BY d.id, d.name
        """,
        (user_id,),
    )
    deck_stats = [dict(row) for row in cur.fetchall()]

    conn.close()
    return {
        "streak": streak,
        "heatmap": heatmap,
        "hardest_cards": hardest_cards,
        "forgetting_rate": forgetting_rate,
        "total_reviewed": total_reviewed,
        "deck_stats": deck_stats,
    }


def _calculate_streak(dates):
    if not dates:
        return 0
    streak = 0
    current = datetime.datetime.now().date()
    for d in dates:
        d_date = datetime.datetime.strptime(d, "%Y-%m-%d").date()
        if (current - d_date).days == streak:
            streak += 1
        else:
            break
    return streak
