from pydantic import BaseModel
from datetime import datetime

class NotificationPublic(BaseModel):
    id: str
    student_id: str
    message: str
    post_id: str
    classroom_id: str
    is_read: bool = False
    created_at: datetime
