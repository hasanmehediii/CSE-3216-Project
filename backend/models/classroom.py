from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import List, Optional

class ClassroomCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)

class ClassroomPublic(BaseModel):
    id: str
    name: str
    teacher_id: str
    join_pin: str
    students: List[str] = []
    created_at: datetime
    
class ClassroomInvite(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
