from src import database as db
import os
from dotenv import load_dotenv

load_dotenv()

def check():
    try:
        conn = db.get_connection()
        cur = db.get_cursor(conn)
        print(f"Connected to: {db.DATABASE_URL.split('@')[-1]}")
        
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cur.fetchall()
        print(f"Tables found: {[t[0] for t in tables]}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
