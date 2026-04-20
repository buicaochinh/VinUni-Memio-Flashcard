import os
import psycopg2
from src.app.core.config import DATABASE_URL
from src.app.db.session import init_db as _init_db

# Assume Postgres as requested by user (removing SQLite logic)
IS_POSTGRES = True

def init_db():
    """Delegates to the new init_db implementation."""
    _init_db()

def get_connection():
    """Returns a raw psycopg2 connection."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set")
    
    # Ensure postgresql:// prefix
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        
    return psycopg2.connect(url)

def get_cursor(conn):
    """Returns a cursor from the connection."""
    return conn.cursor()
