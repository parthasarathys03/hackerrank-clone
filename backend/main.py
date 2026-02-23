from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
import sqlite3
import uuid
from datetime import datetime
import asyncio
import sys
import io
from contextlib import asynccontextmanager

# PDF generation imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Fix Windows event loop for subprocess BEFORE any asyncio operations
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from database import init_db, get_db
from models import LoginRequest, RunCodeRequest, SubmitCodeRequest, RunSqlRequest, SubmitSqlRequest, StartExamRequest, ExamSubmitRequest
from runner import PythonRunner, normalize_output, compare_outputs, get_verdict
from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS
from excel_service import read_all_results, add_result, export_excel, create_sample_data, ensure_excel_exists

# Concurrency semaphore for 25 concurrent executions
execution_semaphore = asyncio.Semaphore(25)

app = FastAPI()

# Initialize database
init_db()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (for one-day MVP)
sessions = {}

# In-memory exam session store
exam_sessions = {}  # {user_id: {"start_time": datetime, "end_time": datetime, "status": "active"|"completed", "answers": {}}}

EXAM_DURATION_SECONDS = 2 * 60 * 60  # 2 hours

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
    total_execution_time = 0
    
    async with execution_semaphore:
        for i, test_case in enumerate(problem["test_cases"]):
            start_time = datetime.now()
            result = await runner.run_with_input(request.code, test_case["input"])
            execution_time = (datetime.now() - start_time).total_seconds() * 1000  # ms
            total_execution_time += execution_time
            
            if result["status"] == "success":
                expected_output = test_case["output"]
                actual_output = result["stdout"]
                
                # Use normalized comparison to avoid false negatives
                if compare_outputs(actual_output, expected_output):
                    passed_tests += 1
                else:
                    failed_details.append({
                        "test_case": i + 1,
                        "expected": normalize_output(expected_output),
                        "actual": normalize_output(actual_output)
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
    
    # Determine verdict
    verdict = get_verdict(passed_tests, total_tests)
    avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
    
    # Save submission
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.code, passed_tests, total_tests, score, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
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
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
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
        "verdict": verdict,
        "execution_time_ms": round(avg_execution_time, 2),
        "failed_details": failed_details
    }


# --- Assessment Dashboard API Endpoints ---

# Initialize Excel file with sample data on startup
ensure_excel_exists()


class AssessmentResultRequest(BaseModel):
    """Request body for posting new assessment result"""
    candidate_id: str
    name: str
    email: str
    phone: str
    test_date: str
    login_time: str
    submit_time: str
    submission_type: str
    time_taken_min: int
    total_questions: int
    python_questions: int
    sql_questions: int
    python_score: float
    sql_score: float
    problem_testcases: dict
    problem_scores: dict


@app.get("/api/assessment/results")
async def get_assessment_results(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None
):
    """
    Get all assessment results with optional filters.
    Query params: date_from, date_to, verdict (Good|Average|Below Average), submission_type (Manual|Auto)
    """
    try:
        results = read_all_results(date_from, date_to, verdict, submission_type)
        return {
            "success": True,
            "total": len(results),
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")


@app.post("/api/assessment/results")
async def post_assessment_result(request: AssessmentResultRequest):
    """
    Add a new assessment result. 
    Auto-calculates: overall_score, overall_percentage, python_score_percentage, sql_score_percentage, overall_verdict
    """
    try:
        data = request.model_dump()
        result = add_result(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding result: {str(e)}")


@app.get("/api/assessment/export")
async def export_assessment_results(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None
):
    """
    Export filtered assessment results as Excel file.
    Returns downloadable Excel with formatted sheets.
    """
    try:
        excel_bytes = export_excel(date_from, date_to, verdict, submission_type)
        filename = f"HR_Assessment_Report_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting results: {str(e)}")


@app.post("/api/assessment/init-sample-data")
async def init_sample_data():
    """Initialize Excel file with sample data for 5 candidates (for testing)"""
    try:
        count = create_sample_data()
        return {"success": True, "message": f"Created sample data for {count} candidates"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sample data: {str(e)}")

@app.get("/hr/results")
async def get_hr_results(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute(
        """SELECT name, email, problem_id, best_score, passed_tests, total_tests, verdict, execution_time_ms, time_taken, updated_at
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
            "verdict": row[6] or "Pending",
            "execution_time_ms": row[7] or 0,
            "time_taken": row[8] or 0,
            "updated_at": row[9]
        }
        for row in results
    ]


def generate_pdf_report(candidates_data: list) -> bytes:
    """Generate a professional PDF report of candidate results"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=30,
        textColor=colors.HexColor('#1a1a2e')
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#16213e')
    )
    normal_style = styles['Normal']
    
    elements = []
    
    # Title
    elements.append(Paragraph("Coding Assessment Report", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", normal_style))
    elements.append(Spacer(1, 30))
    
    # Summary section
    total_candidates = len(candidates_data)
    if total_candidates > 0:
        avg_score = sum(c['avg_score'] for c in candidates_data) / total_candidates
        accepted_count = sum(1 for c in candidates_data if any(p['verdict'] == 'Accepted' for p in c['problems']))
    else:
        avg_score = 0
        accepted_count = 0
    
    elements.append(Paragraph("Executive Summary", heading_style))
    summary_data = [
        ["Total Candidates", str(total_candidates)],
        ["Average Score", f"{avg_score:.1f}%"],
        ["Full Solutions", str(accepted_count)],
    ]
    summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8e8e8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    # Candidate details
    for candidate in candidates_data:
        elements.append(Paragraph(f"Candidate: {candidate['name']}", heading_style))
        elements.append(Paragraph(f"Email: {candidate['email']}", normal_style))
        elements.append(Paragraph(f"Overall Score: {candidate['avg_score']:.1f}%", normal_style))
        elements.append(Spacer(1, 10))
        
        # Problem results table
        table_data = [["Problem", "Score", "Tests", "Verdict", "Time"]]
        for prob in candidate['problems']:
            verdict_text = prob['verdict']
            table_data.append([
                prob['problem_id'][:20],
                f"{prob['best_score']:.1f}%",
                f"{prob['passed_tests']}/{prob['total_tests']}",
                verdict_text,
                f"{prob['time_taken']}s" if prob['time_taken'] else "--"
            ])
        
        t = Table(table_data, colWidths=[1.8*inch, 0.8*inch, 0.8*inch, 1*inch, 0.8*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f0f0')]),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


@app.get("/hr/report/pdf")
async def get_hr_report_pdf(db: sqlite3.Connection = Depends(get_db)):
    """Generate and download PDF report of all candidate results"""
    cursor = db.cursor()
    cursor.execute(
        """SELECT name, email, problem_id, best_score, passed_tests, total_tests, verdict, execution_time_ms, time_taken, updated_at
        FROM hr_results
        ORDER BY name ASC, problem_id ASC"""
    )
    results = cursor.fetchall()
    cursor.close()
    
    # Group by candidate
    candidates = {}
    for row in results:
        email = row[1]
        if email not in candidates:
            candidates[email] = {
                'name': row[0],
                'email': email,
                'problems': [],
                'total_score': 0,
                'count': 0
            }
        candidates[email]['problems'].append({
            'problem_id': row[2],
            'best_score': row[3],
            'passed_tests': row[4],
            'total_tests': row[5],
            'verdict': row[6] or 'Pending',
            'execution_time_ms': row[7] or 0,
            'time_taken': row[8] or 0,
            'updated_at': row[9]
        })
        candidates[email]['total_score'] += row[3]
        candidates[email]['count'] += 1
    
    # Calculate average scores
    candidates_data = []
    for c in candidates.values():
        c['avg_score'] = c['total_score'] / c['count'] if c['count'] > 0 else 0
        candidates_data.append(c)
    
    # Sort by average score descending
    candidates_data.sort(key=lambda x: x['avg_score'], reverse=True)
    
    # Generate PDF
    pdf_bytes = generate_pdf_report(candidates_data)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=candidate_report_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        }
    )


# Language-specific problem routes - MUST be before /problems/{problem_id}
@app.get("/problems/python")
async def get_python_problems():
    """Get all Python problems"""
    return list_problems_by_language("python")

@app.get("/problems/sql")
async def get_sql_problems():
    """Get all SQL problems"""
    return list_problems_by_language("sql")

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

# --- Exam Session Management ---

@app.get("/exam/summary")
async def exam_summary():
    """Get exam overview with all problems and their details"""
    return get_exam_summary()

@app.post("/exam/start")
async def start_exam(request: StartExamRequest):
    """Start a new exam session"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    # Check if exam already started
    if user_id in exam_sessions and exam_sessions[user_id]["status"] == "active":
        exam = exam_sessions[user_id]
        elapsed = (datetime.now() - exam["start_time"]).total_seconds()
        remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
        
        if remaining > 0:
            return {
                "status": "already_started",
                "start_time": exam["start_time"].isoformat(),
                "remaining_seconds": int(remaining),
                "answers": exam.get("answers", {})
            }
        else:
            # Time expired but not submitted
            exam_sessions[user_id]["status"] = "expired"
    
    # Start new exam
    start_time = datetime.now()
    exam_sessions[user_id] = {
        "start_time": start_time,
        "end_time": start_time,  # Will be updated on submit
        "status": "active",
        "answers": {}
    }
    
    return {
        "status": "started",
        "start_time": start_time.isoformat(),
        "remaining_seconds": EXAM_DURATION_SECONDS
    }

@app.get("/exam/status")
async def get_exam_status(session_id: str):
    """Get current exam status and remaining time"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[session_id]
    
    if user_id not in exam_sessions:
        return {"status": "not_started"}
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        return {
            "status": "completed",
            "start_time": exam["start_time"].isoformat(),
            "end_time": exam["end_time"].isoformat()
        }
    
    elapsed = (datetime.now() - exam["start_time"]).total_seconds()
    remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
    
    if remaining <= 0:
        return {
            "status": "expired",
            "start_time": exam["start_time"].isoformat(),
            "remaining_seconds": 0,
            "answers": exam.get("answers", {})
        }
    
    return {
        "status": "active",
        "start_time": exam["start_time"].isoformat(),
        "remaining_seconds": int(remaining),
        "answers": exam.get("answers", {})
    }

@app.post("/exam/save-answer")
async def save_exam_answer(session_id: str, problem_id: str, code: str):
    """Auto-save answer during exam"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[session_id]
    
    if user_id not in exam_sessions or exam_sessions[user_id]["status"] != "active":
        raise HTTPException(status_code=400, detail="No active exam session")
    
    # Check if time expired
    elapsed = (datetime.now() - exam_sessions[user_id]["start_time"]).total_seconds()
    if elapsed >= EXAM_DURATION_SECONDS:
        raise HTTPException(status_code=400, detail="Exam time expired")
    
    exam_sessions[user_id]["answers"][problem_id] = code
    return {"status": "saved"}

@app.post("/exam/submit")
async def submit_exam(request: ExamSubmitRequest, db: sqlite3.Connection = Depends(get_db)):
    """Submit entire exam - either manual or auto (timer expired)"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    if user_id not in exam_sessions:
        raise HTTPException(status_code=400, detail="No exam session found")
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        raise HTTPException(status_code=400, detail="Exam already submitted")
    
    # Mark exam as completed
    exam["status"] = "completed"
    exam["end_time"] = datetime.now()
    
    # Calculate time taken
    time_taken = int((exam["end_time"] - exam["start_time"]).total_seconds())
    
    # Process each answer
    results = []
    total_score = 0
    total_marks = 0
    
    cursor = db.cursor()
    
    # Get user info
    cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
    user_info = cursor.fetchone()
    
    for answer in request.answers:
        problem = get_problem(answer.problem_id)
        if not problem:
            continue
        
        problem_marks = problem.get("marks", 10)
        total_marks += problem_marks
        total_execution_time = 0
        
        # Evaluate based on language
        if answer.language == "sql":
            # SQL evaluation
            passed_tests = 0
            total_tests = len(problem.get("test_cases", []))
            
            for test_case in problem.get("test_cases", []):
                try:
                    start_time = datetime.now()
                    columns, rows = execute_sql_problem_query(problem, answer.code)
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    expected_columns = test_case.get("expected_columns", [])
                    expected_rows = test_case.get("expected_rows", [])
                    if compare_result_sets(columns, rows, expected_columns, expected_rows):
                        passed_tests += 1
                except:
                    pass
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        else:
            # Python evaluation with normalized comparison
            runner = PythonRunner()
            passed_tests = 0
            total_tests = len(problem.get("test_cases", []))
            
            async with execution_semaphore:
                for test_case in problem.get("test_cases", []):
                    start_time = datetime.now()
                    result = await runner.run_with_input(answer.code, test_case["input"])
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    if result["status"] == "success":
                        # Use normalized comparison
                        if compare_outputs(result["stdout"], test_case["output"]):
                            passed_tests += 1
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determine verdict and average execution time
        verdict = get_verdict(passed_tests, total_tests)
        avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
        
        # Save submission
        cursor.execute(
            """INSERT INTO submissions
            (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, answer.problem_id, answer.code, passed_tests, total_tests, score, verdict, avg_execution_time, time_taken, datetime.now().isoformat())
        )
        submission_id = cursor.lastrowid
        
        # Update hr_results for best score
        cursor.execute(
            """SELECT best_score FROM hr_results WHERE user_id = ? AND problem_id = ?""",
            (user_id, answer.problem_id)
        )
        existing = cursor.fetchone()
        current_best = existing[0] if existing else 0
        
        if score > current_best:
            cursor.execute(
                """INSERT OR REPLACE INTO hr_results
                (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, user_info[0], user_info[1], answer.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, time_taken, datetime.now().isoformat())
            )
        
        total_score += (score / 100) * problem_marks
        results.append({
            "problem_id": answer.problem_id,
            "passed_tests": passed_tests,
            "total_tests": total_tests,
            "score": score,
            "verdict": verdict,
            "execution_time_ms": round(avg_execution_time, 2)
        })
    
    db.commit()
    cursor.close()
    
    return {
        "status": "submitted",
        "submission_type": "auto" if request.auto_submit else "manual",
        "time_taken": time_taken,
        "total_score": total_score,
        "total_marks": total_marks,
        "percentage": (total_score / total_marks * 100) if total_marks > 0 else 0,
        "results": results
    }

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
    total_execution_time = 0

    async with execution_semaphore:
        for idx, test_case in enumerate(test_cases):
            try:
                start_time = datetime.now()
                columns, rows = execute_sql_problem_query(problem, request.query)
                execution_time = (datetime.now() - start_time).total_seconds() * 1000
                total_execution_time += execution_time
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
    
    # Determine verdict and average execution time
    verdict = get_verdict(passed_tests, total_tests)
    avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0

    # Store submission (same table as Python)
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.query, passed_tests, total_tests, score, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
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
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
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
        "verdict": verdict,
        "execution_time_ms": round(avg_execution_time, 2),
        "failed_details": failed_details
    }
