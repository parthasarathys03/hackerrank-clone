import sqlite3
from contextlib import contextmanager

DATABASE_PATH = "coding_platform.db"

def init_db():
    """Initialize database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Submissions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            problem_id TEXT NOT NULL,
            code TEXT NOT NULL,
            passed_tests INTEGER NOT NULL,
            total_tests INTEGER NOT NULL,
            score REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # HR Results table (final table for HR)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hr_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            problem_id TEXT NOT NULL,
            best_score REAL NOT NULL,
            passed_tests INTEGER NOT NULL,
            total_tests INTEGER NOT NULL,
            best_submission_id INTEGER NOT NULL,
            time_taken INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, problem_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (best_submission_id) REFERENCES submissions (id)
        )
    """)

    # Add time_taken column if it doesn't exist (migration for existing DB)
    try:
        cursor.execute("ALTER TABLE submissions ADD COLUMN time_taken INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE hr_results ADD COLUMN time_taken INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

def get_db():
    """Dependency for getting database connection"""
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    try:
        yield conn
    finally:
        conn.close()
