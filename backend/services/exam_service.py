"""
Exam Service — Business logic for the Live Exam feature.

Uses ExamContext (State Pattern) for all state-dependent operations.
The service layer handles DB I/O and timer validation, then delegates
state-specific decisions to the ExamContext.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database
from services.exam_states import ExamContext
from services.observer import ClassroomNoticeBoard, StudentNotifier


# ════════════════════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════════════════════


async def _get_exam_or_404(exam_id: str) -> dict:
    db = get_database()
    doc = await db["exams"].find_one({"_id": ObjectId(exam_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Exam not found")
    return doc


def _clean_doc(doc: dict) -> dict:
    """Convert _id to id string and remove _id."""
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


def _remaining_seconds(started_at: datetime, duration_minutes: int) -> int:
    """Compute remaining seconds for a student's exam session."""
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    remaining = (duration_minutes * 60) - elapsed
    return max(0, int(remaining))


# ════════════════════════════════════════════════════════════════
#  Create Exam  (always starts in Draft state)
# ════════════════════════════════════════════════════════════════


async def create_exam(
    classroom_id: str,
    teacher_id: str,
    title: str,
    exam_type: str,
    duration_minutes: int,
    questions: list,
):
    db = get_database()

    # Verify classroom exists and teacher owns it
    classroom = await db["classrooms"].find_one({"_id": ObjectId(classroom_id)})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    if classroom["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your classroom")

    # Build question documents with individual IDs
    question_docs = []
    for q in questions:
        q_doc = {
            "_id": str(ObjectId()),          # string id for each question
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options if q.question_type == "mcq" else None,
            "correct_option": q.correct_option if q.question_type == "mcq" else None,
        }
        question_docs.append(q_doc)

    exam_doc = {
        "classroom_id": classroom_id,
        "teacher_id": teacher_id,
        "title": title,
        "exam_type": exam_type,
        "duration_minutes": duration_minutes,
        "questions": question_docs,
        "state": "draft",                    # ← initial state
        "created_at": datetime.now(timezone.utc),
    }

    result = await db["exams"].insert_one(exam_doc)
    exam_doc["_id"] = result.inserted_id
    return _clean_doc(exam_doc)


# ════════════════════════════════════════════════════════════════
#  Update Questions  (only in Draft state)
# ════════════════════════════════════════════════════════════════


async def update_questions(exam_id: str, teacher_id: str, questions: list):
    doc = await _get_exam_or_404(exam_id)

    if doc["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your exam")

    # Use state pattern to verify we're in draft
    ctx = ExamContext(doc)
    if ctx.state_name != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot edit questions in '{ctx.state_name}' state",
        )

    question_docs = []
    for q in questions:
        q_doc = {
            "_id": str(ObjectId()),
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": q.options if q.question_type == "mcq" else None,
            "correct_option": q.correct_option if q.question_type == "mcq" else None,
        }
        question_docs.append(q_doc)

    db = get_database()
    await db["exams"].update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"questions": question_docs}},
    )
    return {"message": "Questions updated", "count": len(question_docs)}


# ════════════════════════════════════════════════════════════════
#  Publish Exam  (Draft → Published)
# ════════════════════════════════════════════════════════════════


async def publish_exam(exam_id: str, teacher_id: str):
    doc = await _get_exam_or_404(exam_id)
    if doc["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your exam")

    ctx = ExamContext(doc)
    result = ctx.publish()  # state handles validation & transition

    db = get_database()
    await db["exams"].update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"state": ctx.state_name}},
    )
    return result


# ════════════════════════════════════════════════════════════════
#  Enter Exam  (student starts session)
# ════════════════════════════════════════════════════════════════


async def enter_exam(exam_id: str, student_id: str):
    doc = await _get_exam_or_404(exam_id)
    db = get_database()

    # Check student is in the classroom
    classroom = await db["classrooms"].find_one({"_id": ObjectId(doc["classroom_id"])})
    if not classroom or student_id not in classroom.get("students", []):
        raise HTTPException(status_code=403, detail="You are not enrolled in this classroom")

    ctx = ExamContext(doc)

    # Check if student already has a session (re-entry)
    existing_session = await db["exam_sessions"].find_one(
        {"exam_id": exam_id, "student_id": student_id}
    )

    if existing_session:
        # Re-entry: check if timer is still valid
        remaining = _remaining_seconds(
            existing_session["started_at"], doc["duration_minutes"]
        )
        if remaining <= 0:
            raise HTTPException(status_code=400, detail="Your time has expired")

        if existing_session.get("submitted"):
            raise HTTPException(status_code=400, detail="You have already submitted")

        return {
            "session": {
                "exam_id": exam_id,
                "student_id": student_id,
                "started_at": existing_session["started_at"].isoformat(),
                "remaining_seconds": remaining,
                "submitted": False,
            },
            "questions": _strip_answers(doc.get("questions", [])),
        }

    # New entry — delegate to state
    state_result = ctx.start_student_session(student_id)

    # Persist state transition if it happened (Published → InProgress)
    await db["exams"].update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"state": ctx.state_name}},
    )

    # Create session document
    now = datetime.now(timezone.utc)
    session_doc = {
        "exam_id": exam_id,
        "student_id": student_id,
        "started_at": now,
        "submitted": False,
        "answers": [],
    }
    await db["exam_sessions"].insert_one(session_doc)

    remaining = doc["duration_minutes"] * 60
    return {
        "session": {
            "exam_id": exam_id,
            "student_id": student_id,
            "started_at": now.isoformat(),
            "remaining_seconds": remaining,
            "submitted": False,
        },
        "questions": _strip_answers(doc.get("questions", [])),
    }


def _strip_answers(questions: list) -> list:
    """Remove correct_option from questions so students can't see answers."""
    sanitized = []
    for q in questions:
        sanitized.append({
            "id": q["_id"],
            "question_text": q["question_text"],
            "question_type": q["question_type"],
            "options": q.get("options"),
        })
    return sanitized


# ════════════════════════════════════════════════════════════════
#  Submit Answers
# ════════════════════════════════════════════════════════════════


async def submit_answers(exam_id: str, student_id: str, answers: list):
    doc = await _get_exam_or_404(exam_id)
    db = get_database()

    ctx = ExamContext(doc)

    # Check session exists
    session = await db["exam_sessions"].find_one(
        {"exam_id": exam_id, "student_id": student_id}
    )
    if not session:
        raise HTTPException(status_code=400, detail="No active session found")
    if session.get("submitted"):
        raise HTTPException(status_code=400, detail="Already submitted")

    # Timer validation (server-side)
    remaining = _remaining_seconds(session["started_at"], doc["duration_minutes"])
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Time expired — cannot submit")

    # Delegate to state (validates state allows submission)
    ctx.submit_answers(student_id, answers)

    # Persist answers
    answer_docs = []
    for a in answers:
        answer_docs.append({
            "question_id": a.question_id,
            "selected_option": a.selected_option,
            "answer_text": a.answer_text,
        })

    now = datetime.now(timezone.utc)
    await db["exam_sessions"].update_one(
        {"_id": session["_id"]},
        {"$set": {
            "answers": answer_docs,
            "submitted": True,
            "submitted_at": now,
        }},
    )

    return {"message": "Answers submitted successfully", "submitted_at": now.isoformat()}


# ════════════════════════════════════════════════════════════════
#  Close Exam
# ════════════════════════════════════════════════════════════════


async def close_exam(exam_id: str, teacher_id: str):
    doc = await _get_exam_or_404(exam_id)
    if doc["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your exam")

    ctx = ExamContext(doc)
    result = ctx.close()

    db = get_database()
    await db["exams"].update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"state": ctx.state_name}},
    )
    return result


# ════════════════════════════════════════════════════════════════
#  Assign Marks  (Closed → Graded)
# ════════════════════════════════════════════════════════════════


async def assign_marks(exam_id: str, teacher_id: str, marks_list: list):
    doc = await _get_exam_or_404(exam_id)
    if doc["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your exam")

    ctx = ExamContext(doc)
    result = ctx.assign_marks(marks_list)

    db = get_database()
    # Persist marks in exam_results collection
    for m in marks_list:
        await db["exam_results"].update_one(
            {"exam_id": exam_id, "student_id": m.student_id},
            {"$set": {
                "exam_id": exam_id,
                "student_id": m.student_id,
                "marks": m.marks,
                "feedback": m.feedback,
                "graded_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    # Update exam state
    await db["exams"].update_one(
        {"_id": ObjectId(exam_id)},
        {"$set": {"state": ctx.state_name}},
    )
    return result


# ════════════════════════════════════════════════════════════════
#  Notify Results  (uses Observer pattern)
# ════════════════════════════════════════════════════════════════


async def notify_results(exam_id: str, teacher_id: str):
    doc = await _get_exam_or_404(exam_id)
    if doc["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Not your exam")

    ctx = ExamContext(doc)
    result = ctx.notify_results()

    db = get_database()

    # Fetch all results for this exam
    results_cursor = db["exam_results"].find({"exam_id": exam_id})
    results = []
    async for r in results_cursor:
        results.append(r)

    # Use the existing Observer pattern to notify each student
    notice_board = ClassroomNoticeBoard()

    for r in results:
        student_id = r["student_id"]
        marks = r.get("marks", "N/A")
        feedback = r.get("feedback", "")
        notifier = StudentNotifier(student_id)
        notice_board.attach(notifier)

    # Build a synthetic post_data dict that the observer expects
    notification_data = {
        "_id": ObjectId(),
        "classroom_id": doc["classroom_id"],
        "content": f"📝 Exam '{doc['title']}' results: Your marks have been posted. Check your exam results!",
    }
    await notice_board.notify(notification_data)

    return result


# ════════════════════════════════════════════════════════════════
#  Read Operations
# ════════════════════════════════════════════════════════════════


async def get_classroom_exams(classroom_id: str, user_id: str, user_role: str):
    db = get_database()
    query = {"classroom_id": classroom_id}

    # Students can only see published, in_progress, closed, graded exams
    if user_role == "student":
        query["state"] = {"$in": ["published", "in_progress", "closed", "graded"]}

    cursor = db["exams"].find(query).sort("created_at", -1)
    exams = []
    async for doc in cursor:
        exam = {
            "id": str(doc["_id"]),
            "classroom_id": doc["classroom_id"],
            "teacher_id": doc["teacher_id"],
            "title": doc["title"],
            "exam_type": doc["exam_type"],
            "duration_minutes": doc["duration_minutes"],
            "state": doc["state"],
            "created_at": doc["created_at"],
            "total_questions": len(doc.get("questions", [])),
        }
        exams.append(exam)
    return exams


async def get_exam_detail(exam_id: str, user_id: str, user_role: str):
    doc = await _get_exam_or_404(exam_id)
    db = get_database()

    exam = {
        "id": str(doc["_id"]),
        "classroom_id": doc["classroom_id"],
        "teacher_id": doc["teacher_id"],
        "title": doc["title"],
        "exam_type": doc["exam_type"],
        "duration_minutes": doc["duration_minutes"],
        "state": doc["state"],
        "created_at": doc["created_at"],
        "total_questions": len(doc.get("questions", [])),
    }

    # Teacher sees full questions with answers
    if user_role == "teacher" and doc["teacher_id"] == user_id:
        exam["questions"] = []
        for q in doc.get("questions", []):
            exam["questions"].append({
                "id": q["_id"],
                "question_text": q["question_text"],
                "question_type": q["question_type"],
                "options": q.get("options"),
                "correct_option": q.get("correct_option"),
            })

        # If closed or graded, include student submissions
        if doc["state"] in ("closed", "graded"):
            sessions_cursor = db["exam_sessions"].find({"exam_id": exam_id})
            submissions = []
            async for s in sessions_cursor:
                # Fetch student name
                student_doc = await db["users"].find_one({"_id": ObjectId(s["student_id"])})
                student_name = student_doc["name"] if student_doc else "Unknown"

                # Fetch result if graded
                result_doc = await db["exam_results"].find_one(
                    {"exam_id": exam_id, "student_id": s["student_id"]}
                )

                submissions.append({
                    "student_id": s["student_id"],
                    "student_name": student_name,
                    "submitted": s.get("submitted", False),
                    "submitted_at": s.get("submitted_at"),
                    "answers": s.get("answers", []),
                    "marks": result_doc.get("marks") if result_doc else None,
                    "feedback": result_doc.get("feedback") if result_doc else None,
                })
            exam["submissions"] = submissions
    else:
        # Student: strip answers
        exam["questions"] = _strip_answers(doc.get("questions", []))

    return exam


async def get_student_result(exam_id: str, student_id: str):
    db = get_database()
    result = await db["exam_results"].find_one(
        {"exam_id": exam_id, "student_id": student_id}
    )
    if not result:
        return None

    student_doc = await db["users"].find_one({"_id": ObjectId(student_id)})
    student_name = student_doc["name"] if student_doc else "Unknown"

    session = await db["exam_sessions"].find_one(
        {"exam_id": exam_id, "student_id": student_id}
    )

    return {
        "exam_id": exam_id,
        "student_id": student_id,
        "student_name": student_name,
        "marks": result.get("marks"),
        "feedback": result.get("feedback"),
        "submitted_at": session.get("submitted_at") if session else None,
    }


async def get_exam_sessions(exam_id: str):
    """Get all active sessions for an exam (for teacher live dashboard)."""
    doc = await _get_exam_or_404(exam_id)
    db = get_database()

    cursor = db["exam_sessions"].find({"exam_id": exam_id})
    sessions = []
    async for s in cursor:
        student_doc = await db["users"].find_one({"_id": ObjectId(s["student_id"])})
        student_name = student_doc["name"] if student_doc else "Unknown"
        remaining = _remaining_seconds(s["started_at"], doc["duration_minutes"])
        sessions.append({
            "student_id": s["student_id"],
            "student_name": student_name,
            "started_at": s["started_at"],
            "remaining_seconds": remaining,
            "submitted": s.get("submitted", False),
        })
    return sessions
