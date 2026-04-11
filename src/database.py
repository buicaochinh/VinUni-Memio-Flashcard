import datetime
import secrets
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_NAME = DATA_DIR / "flashcards.db"


def get_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            name TEXT,
            email TEXT,
            photo_url TEXT
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            description TEXT DEFAULT '',
            is_public INTEGER DEFAULT 0,
            share_token TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER,
            front TEXT,
            back TEXT,
            difficulty TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (deck_id) REFERENCES decks (id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            card_id INTEGER,
            interval INTEGER DEFAULT 0,
            repetition INTEGER DEFAULT 0,
            ease_factor REAL DEFAULT 2.5,
            last_quality INTEGER DEFAULT -1,
            last_reviewed TEXT,
            next_review TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (card_id) REFERENCES flashcards (id),
            UNIQUE(user_id, card_id)
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            deck_id INTEGER,
            session_date TEXT DEFAULT CURRENT_DATE,
            cards_reviewed INTEGER DEFAULT 0,
            avg_quality REAL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, deck_id, session_date)
        )
        """
    )

    # Safe migrations for existing installs
    _migrate(cursor)

    conn.commit()
    conn.close()


def _migrate(cursor):
    """Add new columns to existing tables without breaking old installs."""
    migrations = [
        ("ALTER TABLE users ADD COLUMN photo_url TEXT", None),
        ("ALTER TABLE decks ADD COLUMN description TEXT DEFAULT ''", None),
        ("ALTER TABLE decks ADD COLUMN is_public INTEGER DEFAULT 0", None),
        ("ALTER TABLE decks ADD COLUMN share_token TEXT", None),
        ("ALTER TABLE flashcards ADD COLUMN difficulty TEXT DEFAULT 'medium'", None),
        ("ALTER TABLE progress ADD COLUMN last_quality INTEGER DEFAULT -1", None),
    ]
    for sql, _ in migrations:
        try:
            cursor.execute(sql)
        except Exception:
            pass  # Column already exists


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_or_create_user(google_id, name, email, photo_url=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
    user = cursor.fetchone()
    if not user:
        cursor.execute(
            "INSERT INTO users (google_id, name, email, photo_url) VALUES (?, ?, ?, ?)",
            (google_id, name, email, photo_url),
        )
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        user = cursor.fetchone()
    else:
        # Update name/email/photo in case they changed
        cursor.execute(
            "UPDATE users SET name=?, email=?, photo_url=? WHERE google_id=?",
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
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO decks (user_id, name, description) VALUES (?, ?, ?)",
        (user_id, name, description),
    )
    conn.commit()
    deck_id = cursor.lastrowid
    conn.close()
    return deck_id


def get_user_decks(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    decks = cursor.fetchall()
    conn.close()
    return [dict(d) for d in decks]


def get_deck_by_id(deck_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decks WHERE id = ?", (deck_id,))
    deck = cursor.fetchone()
    conn.close()
    return dict(deck) if deck else None


def get_deck_by_share_token(token):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decks WHERE share_token = ? AND is_public = 1", (token,))
    deck = cursor.fetchone()
    conn.close()
    return dict(deck) if deck else None


def enable_deck_sharing(deck_id):
    token = secrets.token_urlsafe(8)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE decks SET is_public=1, share_token=? WHERE id=?",
        (token, deck_id),
    )
    conn.commit()
    conn.close()
    return token


def disable_deck_sharing(deck_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE decks SET is_public=0 WHERE id=?", (deck_id,))
    conn.commit()
    conn.close()


def delete_deck(deck_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM flashcards WHERE deck_id=?", (deck_id,))
    cursor.execute("DELETE FROM decks WHERE id=?", (deck_id,))
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Flashcards
# ---------------------------------------------------------------------------

def add_flashcard(deck_id, front, back, difficulty="medium"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO flashcards (deck_id, front, back, difficulty) VALUES (?, ?, ?, ?)",
        (deck_id, front, back, difficulty),
    )
    conn.commit()
    card_id = cursor.lastrowid
    conn.close()
    return card_id


def bulk_add_flashcards(deck_id, cards):
    """cards: list of dicts with front, back, difficulty keys"""
    conn = get_connection()
    cursor = conn.cursor()
    for card in cards:
        cursor.execute(
            "INSERT INTO flashcards (deck_id, front, back, difficulty) VALUES (?, ?, ?, ?)",
            (deck_id, card["front"], card["back"], card.get("difficulty", "medium")),
        )
    conn.commit()
    conn.close()


def update_flashcard(card_id, front, back, difficulty=None):
    conn = get_connection()
    cursor = conn.cursor()
    if difficulty:
        cursor.execute(
            "UPDATE flashcards SET front=?, back=?, difficulty=? WHERE id=?",
            (front, back, difficulty, card_id),
        )
    else:
        cursor.execute(
            "UPDATE flashcards SET front=?, back=? WHERE id=?",
            (front, back, card_id),
        )
    conn.commit()
    conn.close()


def delete_flashcard(card_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM progress WHERE card_id=?", (card_id,))
    cursor.execute("DELETE FROM flashcards WHERE id=?", (card_id,))
    conn.commit()
    conn.close()


def get_deck_cards(deck_id, user_id):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
    SELECT f.*, p.interval, p.repetition, p.ease_factor, p.last_quality,
           p.last_reviewed, p.next_review
    FROM flashcards f
    LEFT JOIN progress p ON f.id = p.card_id AND p.user_id = ?
    WHERE f.deck_id = ?
    ORDER BY f.created_at ASC
    """
    cursor.execute(query, (user_id, deck_id))
    cards = cursor.fetchall()
    conn.close()
    return [dict(card) for card in cards]


def get_public_deck_cards(deck_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM flashcards WHERE deck_id=? ORDER BY created_at ASC", (deck_id,))
    cards = cursor.fetchall()
    conn.close()
    return [dict(c) for c in cards]


# ---------------------------------------------------------------------------
# Progress / SM-2
# ---------------------------------------------------------------------------

def update_card_progress(user_id, card_id, interval, repetition, ease_factor, quality=-1):
    conn = get_connection()
    cursor = conn.cursor()
    last_reviewed = datetime.datetime.now().strftime("%Y-%m-%d")
    next_review = (
        datetime.datetime.now() + datetime.timedelta(days=interval)
    ).strftime("%Y-%m-%d")

    cursor.execute(
        """
        INSERT INTO progress (user_id, card_id, interval, repetition, ease_factor,
                              last_quality, last_reviewed, next_review)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, card_id) DO UPDATE SET
            interval = excluded.interval,
            repetition = excluded.repetition,
            ease_factor = excluded.ease_factor,
            last_quality = excluded.last_quality,
            last_reviewed = excluded.last_reviewed,
            next_review = excluded.next_review
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
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO study_sessions (user_id, deck_id, session_date, cards_reviewed, avg_quality)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, deck_id, session_date) DO UPDATE SET
            cards_reviewed = cards_reviewed + excluded.cards_reviewed,
            avg_quality = (avg_quality + excluded.avg_quality) / 2
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
    cursor = conn.cursor()

    # --- Streak: count consecutive days with study sessions ---
    cursor.execute(
        """
        SELECT DISTINCT session_date FROM study_sessions
        WHERE user_id = ? ORDER BY session_date DESC
        """,
        (user_id,),
    )
    dates = [row["session_date"] for row in cursor.fetchall()]
    streak = _calculate_streak(dates)

    # --- Heatmap: last 35 days ---
    cursor.execute(
        """
        SELECT session_date, SUM(cards_reviewed) as total
        FROM study_sessions WHERE user_id = ?
        AND session_date >= date('now', '-35 days')
        GROUP BY session_date
        """,
        (user_id,),
    )
    heatmap = {row["session_date"]: row["total"] for row in cursor.fetchall()}

    # --- Hardest cards: lowest ease_factor ---
    cursor.execute(
        """
        SELECT f.front, f.back, f.difficulty, p.ease_factor, p.repetition,
               p.last_quality, f.deck_id
        FROM progress p
        JOIN flashcards f ON p.card_id = f.id
        WHERE p.user_id = ? AND p.repetition > 0
        ORDER BY p.ease_factor ASC
        LIMIT 10
        """,
        (user_id,),
    )
    hardest_cards = [dict(row) for row in cursor.fetchall()]

    # --- Forgetting rate: % cards with ease_factor < 2.0 ---
    cursor.execute(
        "SELECT COUNT(*) as total FROM progress WHERE user_id=? AND repetition > 0",
        (user_id,),
    )
    total_reviewed = cursor.fetchone()["total"]

    cursor.execute(
        "SELECT COUNT(*) as hard FROM progress WHERE user_id=? AND ease_factor < 2.0",
        (user_id,),
    )
    hard_count = cursor.fetchone()["hard"]

    forgetting_rate = round((hard_count / total_reviewed * 100) if total_reviewed > 0 else 0, 1)

    # --- Per-deck forgetting rates ---
    cursor.execute(
        """
        SELECT d.name, d.id,
               AVG(p.ease_factor) as avg_ef,
               COUNT(p.id) as reviewed_count,
               SUM(CASE WHEN p.ease_factor < 2.0 THEN 1 ELSE 0 END) as hard_count
        FROM progress p
        JOIN flashcards f ON p.card_id = f.id
        JOIN decks d ON f.deck_id = d.id
        WHERE p.user_id = ? AND p.repetition > 0
        GROUP BY d.id
        """,
        (user_id,),
    )
    deck_stats = [dict(row) for row in cursor.fetchall()]

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
