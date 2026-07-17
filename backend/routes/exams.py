from fastapi import APIRouter, Depends, HTTPException
from typing import List

from models.user import UserPublic
from models.exam import ExamCreate, QuestionCreate, AnswerSubmit, MarkAssign
from services.auth_service import get_current_user
from services import exam_service
from pydantic import BaseModel

router = APIRouter(prefix="/exams", tags=["Exams"])


# ── Request Bodies ──────────────────────────────────────────────


class CreateExamBody(BaseModel):
    classroom_id: str
    title: str
    exam_type: str       # "mcq" | "written" | "both"
    duration_minutes: int
    questions: List[QuestionCreate] = []


class UpdateQuestionsBody(BaseModel):
    questions: List[QuestionCreate]


class SubmitAnswersBody(BaseModel):
    answers: List[AnswerSubmit]


class AssignMarksBody(BaseModel):
    marks: List[MarkAssign]


# ── Teacher Endpoints ───────────────────────────────────────────


@router.post("")
async def create_exam(
    payload: CreateExamBody,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create exams")
    return await exam_service.create_exam(
        classroom_id=payload.classroom_id,
        teacher_id=current_user.id,
        title=payload.title,
        exam_type=payload.exam_type,
        duration_minutes=payload.duration_minutes,
        questions=payload.questions,
    )


@router.put("/{exam_id}/questions")
async def update_questions(
    exam_id: str,
    payload: UpdateQuestionsBody,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can edit exams")
    return await exam_service.update_questions(exam_id, current_user.id, payload.questions)


@router.put("/{exam_id}/publish")
async def publish_exam(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can publish exams")
    return await exam_service.publish_exam(exam_id, current_user.id)


@router.put("/{exam_id}/close")
async def close_exam(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can close exams")
    return await exam_service.close_exam(exam_id, current_user.id)


@router.put("/{exam_id}/marks")
async def assign_marks(
    exam_id: str,
    payload: AssignMarksBody,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can assign marks")
    return await exam_service.assign_marks(exam_id, current_user.id, payload.marks)


@router.put("/{exam_id}/notify")
async def notify_results(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can notify results")
    return await exam_service.notify_results(exam_id, current_user.id)


@router.get("/{exam_id}/sessions")
async def get_sessions(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view sessions")
    return await exam_service.get_exam_sessions(exam_id)


# ── Student Endpoints ───────────────────────────────────────────


@router.post("/{exam_id}/enter")
async def enter_exam(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can enter exams")
    return await exam_service.enter_exam(exam_id, current_user.id)


@router.post("/{exam_id}/submit")
async def submit_answers(
    exam_id: str,
    payload: SubmitAnswersBody,
    current_user: UserPublic = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit answers")
    return await exam_service.submit_answers(exam_id, current_user.id, payload.answers)


@router.get("/{exam_id}/result")
async def get_result(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    result = await exam_service.get_student_result(exam_id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="No results found yet")
    return result


# ── Shared Endpoints ────────────────────────────────────────────


@router.get("/classroom/{classroom_id}")
async def get_classroom_exams(
    classroom_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    return await exam_service.get_classroom_exams(
        classroom_id, current_user.id, current_user.role
    )


@router.get("/{exam_id}")
async def get_exam_detail(
    exam_id: str,
    current_user: UserPublic = Depends(get_current_user),
):
    return await exam_service.get_exam_detail(exam_id, current_user.id, current_user.role)
