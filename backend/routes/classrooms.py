from fastapi import APIRouter, Depends
from models.user import UserPublic
from models.classroom import ClassroomCreate
from services.auth_service import get_current_user
from services import classroom_service
from pydantic import BaseModel

router = APIRouter(prefix="/classrooms", tags=["Classrooms"])

@router.post("")
async def create_classroom(payload: ClassroomCreate, current_user: UserPublic = Depends(get_current_user)):
    if current_user.role != "teacher":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only teachers can create classrooms")
    return await classroom_service.create_classroom(payload, current_user.id)

@router.get("")
async def get_classrooms(current_user: UserPublic = Depends(get_current_user)):
    if current_user.role == "teacher":
        return await classroom_service.get_teacher_classrooms(current_user.id)
    else:
        return await classroom_service.get_student_classrooms(current_user.id)

@router.get("/{classroom_id}")
async def get_classroom(classroom_id: str, current_user: UserPublic = Depends(get_current_user)):
    # Simple check could be added here to ensure user has access to classroom
    return await classroom_service.get_classroom_by_id(classroom_id)

class JoinPinPayload(BaseModel):
    pin: str

@router.post("/join")
async def join_classroom(payload: JoinPinPayload, current_user: UserPublic = Depends(get_current_user)):
    if current_user.role != "student":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only students can join classrooms via PIN")
    return await classroom_service.join_classroom_by_pin(payload.pin, current_user.id)
