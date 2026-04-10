import sqlite3
import datetime

DB_NAME = "flashcards.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT UNIQUE,
        name TEXT,
        email TEXT
    )
    """)
    
    # Decks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # Flashcards table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flashcards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deck_id INTEGER,
        front TEXT,
        back TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (deck_id) REFERENCES decks (id)
    )
    """)
    
    # Progress table (SM-2)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_id INTEGER,
        interval INTEGER DEFAULT 0,
        repetition INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        last_reviewed TEXT,
        next_review TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (card_id) REFERENCES flashcards (id),
        UNIQUE(user_id, card_id)
    )
    """)
    
    conn.commit()
    conn.close()

# User functions
def get_or_create_user(google_id, name, email):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
    user = cursor.fetchone()
    if not user:
        cursor.execute("INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)", (google_id, name, email))
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        user = cursor.fetchone()
    conn.close()
    return user

# Deck functions
def create_deck(user_id, name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO decks (user_id, name) VALUES (?, ?)", (user_id, name))
    conn.commit()
    deck_id = cursor.lastrowid
    conn.close()
    return deck_id

def get_user_decks(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM decks WHERE user_id = ?", (user_id,))
    decks = cursor.fetchall()
    conn.close()
    return decks

# Flashcard functions
def add_flashcard(deck_id, front, back):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO flashcards (deck_id, front, back) VALUES (?, ?, ?)", (deck_id, front, back))
    conn.commit()
    conn.close()

def get_deck_cards(deck_id, user_id):
    conn = get_connection()
    cursor = conn.cursor()
    # Join with progress to get SM-2 data
    query = """
    SELECT f.*, p.interval, p.repetition, p.ease_factor, p.last_reviewed, p.next_review
    FROM flashcards f
    LEFT JOIN progress p ON f.id = p.card_id AND p.user_id = ?
    WHERE f.deck_id = ?
    """
    cursor.execute(query, (user_id, deck_id))
    cards = cursor.fetchall()
    conn.close()
    return [dict(card) for card in cards]

# SM-2 Update function
def update_card_progress(user_id, card_id, interval, repetition, ease_factor):
    conn = get_connection()
    cursor = conn.cursor()
    last_reviewed = datetime.datetime.now().strftime("%Y-%m-%d")
    next_review = (datetime.datetime.now() + datetime.timedelta(days=interval)).strftime("%Y-%m-%d")
    
    cursor.execute("""
    INSERT INTO progress (user_id, card_id, interval, repetition, ease_factor, last_reviewed, next_review)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, card_id) DO UPDATE SET
        interval = excluded.interval,
        repetition = excluded.repetition,
        ease_factor = excluded.ease_factor,
        last_reviewed = excluded.last_reviewed,
        next_review = excluded.next_review
    """, (user_id, card_id, interval, repetition, ease_factor, last_reviewed, next_review))
    
    conn.commit()
    conn.close()
