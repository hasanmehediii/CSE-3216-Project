"""
State Pattern — Exam Lifecycle
================================
Each exam goes through:  Draft → Published → InProgress → Closed → Graded

The ExamContext holds the current state and delegates every action to it.
Each concrete state class decides:
  - which actions are allowed
  - what side-effects to trigger
  - which state to transition to next

This eliminates if/elif chains for state checking in the service layer.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from fastapi import HTTPException, status

if TYPE_CHECKING:
    pass  # avoids circular imports


# ════════════════════════════════════════════════════════════════
#  Abstract State
# ════════════════════════════════════════════════════════════════


class ExamState(ABC):
    """
    Base class for all exam states.
    Every action raises 'not allowed in this state' by default.
    Concrete states override only the actions they permit.
    """

    name: str = "unknown"

    # ── teacher actions ──

    def publish(self, context: "ExamContext") -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot publish exam in '{self.name}' state",
        )

    def close(self, context: "ExamContext") -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close exam in '{self.name}' state",
        )

    def assign_marks(self, context: "ExamContext", marks_data: list) -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign marks in '{self.name}' state",
        )

    def notify_results(self, context: "ExamContext") -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot notify results in '{self.name}' state",
        )

    # ── student actions ──

    def start_student_session(self, context: "ExamContext", student_id: str) -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot enter exam in '{self.name}' state",
        )

    def submit_answers(self, context: "ExamContext", student_id: str, answers: list) -> dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit answers in '{self.name}' state",
        )


# ════════════════════════════════════════════════════════════════
#  Concrete States
# ════════════════════════════════════════════════════════════════


class DraftState(ExamState):
    """
    Exam has been created but not yet visible to students.
    Teacher can still add/edit questions (handled at the service level).
    The only allowed transition here is → Published.
    """

    name = "draft"

    def publish(self, context: "ExamContext") -> dict:
        # Validate: must have at least 1 question
        if not context.exam_data.get("questions"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot publish an exam with no questions",
            )
        context.transition_to(PublishedState())
        return {"message": "Exam published successfully", "state": "published"}


class PublishedState(ExamState):
    """
    Exam is visible to students. They can enter it.
    When the first student enters, the exam transitions → InProgress.
    Teacher can also manually close it.
    """

    name = "published"

    def start_student_session(self, context: "ExamContext", student_id: str) -> dict:
        # Transition to InProgress on first entry
        context.transition_to(InProgressState())
        return {"message": "Exam is now in progress", "state": "in_progress"}

    def close(self, context: "ExamContext") -> dict:
        context.transition_to(ClosedState())
        return {"message": "Exam closed", "state": "closed"}


class InProgressState(ExamState):
    """
    At least one student has entered.
    Students can submit answers if their personal timer hasn't expired.
    Teacher can manually close the exam.
    New students can still enter.
    """

    name = "in_progress"

    def start_student_session(self, context: "ExamContext", student_id: str) -> dict:
        # Already in progress — just allow new students to enter
        return {"message": "Joined exam", "state": "in_progress"}

    def submit_answers(self, context: "ExamContext", student_id: str, answers: list) -> dict:
        # Timer validation is done in the service layer (needs DB access)
        # If we reach here, the state allows it
        return {"message": "Answers submitted", "state": "in_progress"}

    def close(self, context: "ExamContext") -> dict:
        context.transition_to(ClosedState())
        return {"message": "Exam closed", "state": "closed"}


class ClosedState(ExamState):
    """
    Exam is closed. No more submissions.
    Teacher can now assign marks → transitions to Graded.
    """

    name = "closed"

    def assign_marks(self, context: "ExamContext", marks_data: list) -> dict:
        context.transition_to(GradedState())
        return {"message": "Marks assigned, exam graded", "state": "graded"}


class GradedState(ExamState):
    """
    Marks are assigned. Teacher can notify students.
    This is the terminal state.
    """

    name = "graded"

    def notify_results(self, context: "ExamContext") -> dict:
        return {"message": "Results notified to students", "state": "graded"}


# ════════════════════════════════════════════════════════════════
#  State Factory — Reconstruct state from DB string
# ════════════════════════════════════════════════════════════════


STATE_MAP = {
    "draft": DraftState,
    "published": PublishedState,
    "in_progress": InProgressState,
    "closed": ClosedState,
    "graded": GradedState,
}


def state_from_name(name: str) -> ExamState:
    """Recreate a state object from its string name (stored in MongoDB)."""
    cls = STATE_MAP.get(name)
    if cls is None:
        raise ValueError(f"Unknown exam state: {name}")
    return cls()


# ════════════════════════════════════════════════════════════════
#  Context — Holds the current state & delegates actions
# ════════════════════════════════════════════════════════════════


class ExamContext:
    """
    The 'Context' in the State Pattern.
    Holds a reference to the current ExamState and the raw exam document.
    All client code talks to ExamContext; it forwards to the active state.
    """

    def __init__(self, exam_data: dict):
        self.exam_data = exam_data
        self._state: ExamState = state_from_name(exam_data.get("state", "draft"))

    @property
    def state(self) -> ExamState:
        return self._state

    @property
    def state_name(self) -> str:
        return self._state.name

    def transition_to(self, new_state: ExamState) -> None:
        """Switch to a new state and record it in the exam data dict."""
        self._state = new_state
        self.exam_data["state"] = new_state.name

    # ── delegated actions ──

    def publish(self) -> dict:
        return self._state.publish(self)

    def close(self) -> dict:
        return self._state.close(self)

    def assign_marks(self, marks_data: list) -> dict:
        return self._state.assign_marks(self, marks_data)

    def notify_results(self) -> dict:
        return self._state.notify_results(self)

    def start_student_session(self, student_id: str) -> dict:
        return self._state.start_student_session(self, student_id)

    def submit_answers(self, student_id: str, answers: list) -> dict:
        return self._state.submit_answers(self, student_id, answers)
