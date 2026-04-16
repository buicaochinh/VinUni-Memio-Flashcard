import sqlite3
import os
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load Env
from dotenv import load_dotenv
load_dotenv()

from src import database as db

def verify():
    tables = ["users", "decks", "flashcards", "progress", "study_sessions"]
    
    # 1. Check SQLite
    sqlite_path = PROJECT_ROOT / "data" / "flashcards.db"
    if sqlite_path.exists():
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_cur = sqlite_conn.cursor()
        print("📊 --- SQLite Stats ---")
        for t in tables:
            try:
                sqlite_cur.execute(f"SELECT COUNT(*) FROM {t}")
                count = sqlite_cur.fetchone()[0]
                print(f"Table {t:15}: {count} rows")
            except:
                print(f"Table {t:15}: Error or missing")
        sqlite_conn.close()
    else:
        print("⚠️ SQLite database not found.")

    print("\n-------------------------\n")

    # 2. Check PostgreSQL
    try:
        pg_conn = db.get_connection()
        pg_cur = db.get_cursor(pg_conn)
        print("🐘 --- PostgreSQL Stats ---")
        for t in tables:
            try:
                pg_cur.execute(f"SELECT COUNT(*) FROM {t}")
                count = pg_cur.fetchone()[0]
                print(f"Table {t:15}: {count} rows")
            except:
                print(f"Table {t:15}: Error or missing")
        pg_conn.close()
    except Exception as e:
        print(f"❌ Could not connect to PostgreSQL: {e}")

if __name__ == "__main__":
    verify()
