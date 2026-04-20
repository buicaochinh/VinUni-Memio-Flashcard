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
    
    print("\n--- PostgreSQL Verification ---\n")

    # Check PostgreSQL
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
