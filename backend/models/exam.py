from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Literal


ExamType = Literal["mcq", "written", "both"]
QuestionType = Literal["mcq", "written"]
ExamStateName = Literal["draft", "published", "in_progress", "closed", "graded"]


# ── Request Models ──────────────────────────────────────────────


class QuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: QuestionType
    options: Optional[List[str]] = None          # 4 options for MCQ
    correct_option: Optional[int] = None         # 0-based index of correct option


class ExamCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    exam_type: ExamType
    duration_minutes: int = Field(..., gt=0, le=300)   # max 5 hours
    questions: List[QuestionCreate] = []


class AnswerSubmit(BaseModel):
    question_id: str
    selected_option: Optional[int] = None        # for MCQ
    answer_text: Optional[str] = None            # for Written


class MarkAssign(BaseModel):
    student_id: str
    marks: float = Field(..., ge=0)
    feedback: Optional[str] = None


# ── Response Models ─────────────────────────────────────────────


class QuestionPublic(BaseModel):
    id: str
    question_text: str
    question_type: QuestionType
    options: Optional[List[str]] = None
    # correct_option is deliberately omitted for students


class QuestionWithAnswer(QuestionPublic):
    correct_option: Optional[int] = None


class ExamPublic(BaseModel):
    id: str
    classroom_id: str
    teacher_id: str
    title: str
    exam_type: ExamType
    duration_minutes: int
    state: ExamStateName
    created_at: datetime
    total_questions: int = 0


class ExamDetailPublic(ExamPublic):
    questions: List[QuestionPublic] = []


class StudentSessionPublic(BaseModel):
    exam_id: str
    student_id: str
    started_at: datetime
    remaining_seconds: int
    submitted: bool = False


class StudentResultPublic(BaseModel):
    exam_id: str
    student_id: str
    student_name: str
    marks: Optional[float] = None
    feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None
    answers: Optional[list] = None
