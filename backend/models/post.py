from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)

class CommentPublic(BaseModel):
    id: str
    post_id: str
    user_id: str
    user_name: str
    content: str
    created_at: datetime

class PostCreate(BaseModel):
    content: str = Field(..., min_length=1)

class PostPublic(BaseModel):
    id: str
    classroom_id: str
    teacher_id: str
    content: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime
    comments: List[CommentPublic] = []
