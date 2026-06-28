from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["student", "teacher", "staff"]

ROLE_ALIASES = {
    "student": "student",
    "teacher": "teacher",
    "staff": "staff",
    "stuff": "staff",
}


def normalize_role(role: str) -> Role:
    normalized = ROLE_ALIASES.get(role.strip().lower())
    if normalized not in {"student", "teacher", "staff"}:
        raise ValueError("Role must be student, teacher, or staff")
    return normalized  # type: ignore[return-value]


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=128)
    role: str
    department: str | None = Field(default=None, max_length=80)


class UserLogin(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: Role
    department: str | None = None
    title: str


class VisibleUserColumn(BaseModel):
    role: Role
    title: str
    users: list[UserPublic]


class VisibleUsersResponse(BaseModel):
    viewer_role: Role
    columns: list[VisibleUserColumn]


class CampusUser(ABC):
    title = "Campus User"

    def __init__(self, name: str, email: str, password_hash: str, department: str | None = None):
        self.name = name
        self.email = email.lower()
        self.password_hash = password_hash
        self.department = department

    @property
    @abstractmethod
    def role(self) -> Role:
        raise NotImplementedError

    def to_document(self) -> dict:
        return {
            "name": self.name,
            "email": self.email,
            "password_hash": self.password_hash,
            "role": self.role,
            "department": self.department,
            "title": self.title,
            "created_at": datetime.now(timezone.utc),
        }


class StudentUser(CampusUser):
    title = "Student"

    @property
    def role(self) -> Role:
        return "student"


class TeacherUser(CampusUser):
    title = "Teacher"

    @property
    def role(self) -> Role:
        return "teacher"


class StaffUser(CampusUser):
    title = "Staff"

    @property
    def role(self) -> Role:
        return "staff"


class CampusUserFactory:
    _classes = {
        "student": StudentUser,
        "teacher": TeacherUser,
        "staff": StaffUser,
    }

    @classmethod
    def create(
        cls,
        role: str,
        name: str,
        email: str,
        password_hash: str,
        department: str | None = None,
    ) -> CampusUser:
        normalized_role = normalize_role(role)
        return cls._classes[normalized_role](name, email, password_hash, department)
