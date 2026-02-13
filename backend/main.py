from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
import sqlite3
import uuid
from datetime import datetime
import asyncio
import sys
from contextlib import asynccontextmanager

# Fix Windows event loop for subprocess BEFORE any asyncio operations
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from database import init_db, get_db
from models import LoginRequest, RunCodeRequest, SubmitCodeRequest, RunSqlRequest, SubmitSqlRequest
from runner import PythonRunner
from problems import get_problem, list_problems, PROBLEMS

# Concurrency semaphore for 25 concurrent executions
execution_semaphore = asyncio.Semaphore(25)

app = FastAPI()

# Initialize database
init_db()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (for one-day MVP)
sessions = {}

@app.post("/login")
async def login(request: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # Check if user exists
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (request.email,))
    user = cursor.fetchone()
    
    if user:
        user_id = user[0]
    else:
        # Create new user
        cursor.execute(
            "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)",
            (request.name, request.email, datetime.now().isoformat())
        )
        db.commit()
        user_id = cursor.lastrowid
    
    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = user_id
    
    cursor.close()
    
    return {
        "session_id": session_id,
        "user_id": user_id,
        "name": request.name,
        "email": request.email
    }

@app.post("/run")
async def run_code(request: RunCodeRequest):
    # Check if custom input is empty or whitespace
    if not request.custom_input or not request.custom_input.strip():
        return {"error": "INPUT_REQUIRED"}
    
    async with execution_semaphore:
        runner = PythonRunner()
        result = await runner.run_with_input(request.code, request.custom_input)
        return result

@app.post("/submit")
async def submit_code(request: SubmitCodeRequest, db: sqlite3.Connection = Depends(get_db)):
    # Verify session
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")
    
    user_id = sessions[request.session_id]
    
    # Get problem details
    problem = get_problem(request.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Run against all test cases (NEVER use custom input)
    runner = PythonRunner()
    passed_tests = 0
    total_tests = len(problem["test_cases"])
    failed_details = []
    
    async with execution_semaphore:
        for i, test_case in enumerate(problem["test_cases"]):
            result = await runner.run_with_input(request.code, test_case["input"])
            
            if result["status"] == "success":
                expected_output = test_case["output"].strip()
                actual_output = result["stdout"].strip()
                
                if actual_output == expected_output:
                    passed_tests += 1
                else:
                    failed_details.append({
                        "test_case": i + 1,
                        "expected": expected_output,
                        "actual": actual_output
                    })
            else:
                # Clean error message (no raw tracebacks in UI)
                error_msg = result["stderr"]
                if "Traceback" in error_msg:
                    # Extract only the last line (actual error)
                    lines = error_msg.strip().split('\n')
                    error_msg = lines[-1] if lines else error_msg
                
                failed_details.append({
                    "test_case": i + 1,
                    "error": error_msg
                })
    
    # Calculate current submission score
    score = (passed_tests / total_tests) * 100
    
    # Save submission
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.code, passed_tests, total_tests, score, request.time_taken, datetime.now().isoformat())
    )
    submission_id = cursor.lastrowid
    db.commit()

    # Get current best score
    cursor.execute(
        """SELECT best_score FROM hr_results
        WHERE user_id = ? AND problem_id = ?""",
        (user_id, request.problem_id)
    )
    existing = cursor.fetchone()
    current_best_score = existing[0] if existing else 0

    # Check if this is a new best
    is_new_best = score > current_best_score

    # Update hr_results only if new best score
    if is_new_best:
        cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
        user_info = cursor.fetchone()

        cursor.execute(
            """INSERT OR REPLACE INTO hr_results
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, request.time_taken, datetime.now().isoformat())
        )
        db.commit()

    cursor.close()

    return {
        "submission_id": submission_id,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "score": score,
        "best_score": score if is_new_best else current_best_score,
        "is_new_best": is_new_best,
        "failed_details": failed_details
    }

@app.get("/hr/results")
async def get_hr_results(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """SELECT name, email, problem_id, best_score, passed_tests, total_tests, time_taken, updated_at
        FROM hr_results
        ORDER BY best_score DESC, name ASC"""
    )
    results = cursor.fetchall()
    cursor.close()

    return [
        {
            "name": row[0],
            "email": row[1],
            "problem_id": row[2],
            "best_score": row[3],
            "passed_tests": row[4],
            "total_tests": row[5],
            "time_taken": row[6] or 0,
            "updated_at": row[7]
        }
        for row in results
    ]

@app.get("/problems/{problem_id}")
async def get_problem_details(problem_id: str):
    problem = get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Return problem without test case details (only show sample)
    return {
        "id": problem["id"],
        "title": problem["title"],
        "statement": problem["statement"],
        "input_format": problem["input_format"],
        "output_format": problem["output_format"],
        "sample_input": problem["sample_input"],
        "sample_output": problem["sample_output"],
        "starter_code": problem["starter_code"],
        "language": problem.get("language", "python")
    }

@app.get("/hr/problems")
async def get_all_problems():
    return list_problems()

@app.post("/hr/problems")
async def add_problem(problem: dict):
    pid = problem.get("id")
    if not pid:
        raise HTTPException(status_code=400, detail="Problem ID is required")
    if pid in PROBLEMS:
        raise HTTPException(status_code=400, detail="Problem ID already exists")
    PROBLEMS[pid] = problem
    return {"status": "ok", "id": pid}

@app.delete("/hr/problems/{problem_id}")
async def delete_problem(problem_id: str):
    if problem_id not in PROBLEMS:
        raise HTTPException(status_code=404, detail="Problem not found")
    del PROBLEMS[problem_id]
    return {"status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- SQL support (SQLite in-memory, HackerRank-style) ---

BLOCKED_SQL_KEYWORDS = ["drop", "attach", "pragma", "alter", "insert", "update", "delete", "create"]

def validate_sql_query(query: str):
    """Validate SQL query for security (allow only SELECT)"""
    text = query or ""
    lowered = text.lower()
    # Block dangerous / mutating statements
    for kw in BLOCKED_SQL_KEYWORDS:
        if kw in lowered:
            raise HTTPException(
                status_code=400,
                detail=f"Only read-only SELECT queries are allowed. Keyword '{kw.upper()}' is not permitted."
            )
    stripped = lowered.strip()
    if not stripped:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    first_token = stripped.split()[0]
    if first_token not in ("select", "with"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed.")

def execute_sql_problem_query(problem: dict, query: str):
    """Execute user SQL query in fresh in-memory database"""
    validate_sql_query(query)
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.cursor()
        cursor.executescript(problem["schema_sql"])
        cursor.executescript(problem["seed_sql"])
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        cursor.close()
        return columns, [list(row) for row in rows]
    finally:
        conn.close()

def normalize_sql_value(v):
    """Normalize SQL value for comparison (trim strings)"""
    if isinstance(v, str):
        return v.strip()
    return v

def compare_result_sets(actual_columns, actual_rows, expected_columns, expected_rows):
    """Compare SQL result sets with flexible ordering"""
    # Normalize column names
    actual_cols_norm = [c.strip().lower() for c in actual_columns]
    expected_cols_norm = [c.strip().lower() for c in expected_columns]

    if set(actual_cols_norm) != set(expected_cols_norm):
        return False

    # Map actual columns to expected order
    index_map = {name: idx for idx, name in enumerate(actual_cols_norm)}
    ordered_actual_rows = []
    for row in actual_rows:
        ordered_actual_rows.append(
            [normalize_sql_value(row[index_map[col]]) for col in expected_cols_norm]
        )

    expected_norm_rows = [
        [normalize_sql_value(v) for v in row] for row in expected_rows
    ]

    # Ignore row order: compare sorted lists
    ordered_actual_rows_sorted = sorted(ordered_actual_rows, key=lambda x: str(x))
    expected_norm_rows_sorted = sorted(expected_norm_rows, key=lambda x: str(x))

    return ordered_actual_rows_sorted == expected_norm_rows_sorted

@app.post("/sql/run")
async def run_sql(request: RunSqlRequest):
    """Execute SQL query and return result set"""
    problem = get_problem(request.problem_id)
    if not problem or problem.get("language") != "sql":
        raise HTTPException(status_code=404, detail="SQL problem not found")

    async with execution_semaphore:
        try:
            columns, rows = execute_sql_problem_query(problem, request.query)
            return {
                "status": "success",
                "columns": columns,
                "rows": rows
            }
        except HTTPException:
            # Re-raise validation errors
            raise
        except sqlite3.Error as e:
            return {
                "status": "error",
                "error": f"SQL execution error: {str(e)}"
            }

@app.post("/sql/submit")
async def submit_sql(request: SubmitSqlRequest, db: sqlite3.Connection = Depends(get_db)):
    """Submit SQL query and evaluate against test cases"""
    # Verify session (same logic as Python submit)
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")
    
    user_id = sessions[request.session_id]

    problem = get_problem(request.problem_id)
    if not problem or problem.get("language") != "sql":
        raise HTTPException(status_code=404, detail="SQL problem not found")

    test_cases = problem.get("test_cases", [])
    if not test_cases:
        raise HTTPException(status_code=500, detail="No test cases configured for this SQL problem.")

    passed_tests = 0
    total_tests = len(test_cases)
    failed_details = []

    async with execution_semaphore:
        for idx, test_case in enumerate(test_cases):
            try:
                columns, rows = execute_sql_problem_query(problem, request.query)
            except HTTPException as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": e.detail
                })
                continue
            except sqlite3.Error as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": f"SQL execution error: {str(e)}"
                })
                continue

            expected_columns = test_case.get("expected_columns", [])
            expected_rows = test_case.get("expected_rows", [])

            if compare_result_sets(columns, rows, expected_columns, expected_rows):
                passed_tests += 1
            else:
                failed_details.append({
                    "test_case": idx + 1,
                    "expected": f"Columns: {expected_columns}, Rows: {expected_rows}",
                    "actual": f"Columns: {columns}, Rows: {rows}"
                })

    score = (passed_tests / total_tests) * 100

    # Store submission (same table as Python)
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.query, passed_tests, total_tests, score, request.time_taken, datetime.now().isoformat())
    )
    submission_id = cursor.lastrowid
    db.commit()

    # Best score logic in hr_results (same as Python)
    cursor.execute(
        """SELECT best_score FROM hr_results
        WHERE user_id = ? AND problem_id = ?""",
        (user_id, request.problem_id)
    )
    existing = cursor.fetchone()
    current_best_score = existing[0] if existing else 0

    is_new_best = score > current_best_score

    if is_new_best:
        cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
        user_info = cursor.fetchone()

        cursor.execute(
            """INSERT OR REPLACE INTO hr_results
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, request.time_taken, datetime.now().isoformat())
        )
        db.commit()

    cursor.close()

    return {
        "submission_id": submission_id,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "score": score,
        "best_score": score if is_new_best else current_best_score,
        "is_new_best": is_new_best,
        "failed_details": failed_details
    }
