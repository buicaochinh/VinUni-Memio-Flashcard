import sqlite3
import sys
import importlib
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------
# 0. Load ENV *BEFORE* importing any project modules
# ---------------------------------------------------------------------
load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Force reload or import AFTER load_dotenv
from src import database
importlib.reload(database)
db = database

from src.config import DATABASE_URL

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def ensure_table_exists(pg_cur, table):
    pg_cur.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public'
              AND table_name=%s
        )
        """,
        (table,),
    )
    return pg_cur.fetchone()[0]


# ---------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------
def migrate():
    print("🚀 Starting migration to PostgreSQL")
    print(f"🔗 Target DB: {DATABASE_URL}")

    if not db.IS_POSTGRES:
        print("❌ DATABASE_URL is NOT PostgreSQL. Abort.")
        return

    # 1. Initialize PostgreSQL schema
    print("📋 Initializing PostgreSQL schema...")
    db.init_db()
    print("✅ Schema initialized")

    # 2. Connect to SQLite (source)
    sqlite_path = PROJECT_ROOT / "data" / "flashcards.db"
    if not sqlite_path.exists():
        print(f"⚠️ SQLite not found at {sqlite_path}. Nothing to migrate.")
        return

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # 3. Connect to PostgreSQL (destination)
    pg_conn = db.get_connection()
    pg_cur = db.get_cursor(pg_conn)

    tables = ["users", "decks", "flashcards", "progress", "study_sessions"]

    # 4. Migrate data
    for table in tables:
        print(f"\n📦 Migrating table: {table}")

        if not ensure_table_exists(pg_cur, table):
            print(f"  ❌ Table '{table}' does NOT exist in PostgreSQL. Skipping.")
            continue

        sqlite_cur.execute(f"SELECT * FROM {table}")
        rows = sqlite_cur.fetchall()

        if not rows:
            print(f"  ⚠️ No data in SQLite table '{table}'. Skipping.")
            continue

        cols = rows[0].keys()
        col_str = ", ".join(cols)
        placeholders = ", ".join(["%s"] * len(cols))

        # Clear destination table (safe because it exists)
        pg_cur.execute(f"TRUNCATE TABLE {table} CASCADE")

        insert_sql = f"INSERT INTO {table} ({col_str}) VALUES ({placeholders})"

        for row in rows:
            pg_cur.execute(insert_sql, tuple(row))

        print(f"  ✅ Migrated {len(rows)} rows")

    pg_conn.commit()

    # 5. Sync SERIAL sequences (CRITICAL)
    print("\n🔄 Syncing PostgreSQL ID sequences...")
    for table in tables:
        pg_cur.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name=%s AND column_name='id'
            )
            """,
            (table,),
        )
        has_id = pg_cur.fetchone()[0]
        if has_id:
            # Note: We must use string formatting for table name in sequence helper
            # as pg_get_serial_sequence takes table name as literal string
            pg_cur.execute(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE(MAX(id), 1)
                )
                FROM {table}
                """
            )

    pg_conn.commit()

    sqlite_conn.close()
    pg_conn.close()

    print("\n✨ Migration completed SUCCESSFULLY!")


# ---------------------------------------------------------------------
if __name__ == "__main__":
    migrate()
