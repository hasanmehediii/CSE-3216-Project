from fastapi import APIRouter, Depends, Form, UploadFile, File
from models.user import UserPublic
from services.auth_service import get_current_user
from services import post_service
import os
import secrets
import shutil

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("")
async def create_post(
    classroom_id: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    current_user: UserPublic = Depends(get_current_user)
):
    if current_user.role != "teacher":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only teachers can post")
        
    file_url = None
    file_name = None
    if file:
        file_name = file.filename
        random_prefix = secrets.token_hex(4)
        safe_filename = f"{random_prefix}_{file_name}"
        upload_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, safe_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/uploads/{safe_filename}"
        
    return await post_service.create_post(
        classroom_id=classroom_id,
        teacher_id=current_user.id,
        content=content,
        file_url=file_url,
        file_name=file_name
    )

@router.get("/{classroom_id}")
async def get_posts(classroom_id: str, current_user: UserPublic = Depends(get_current_user)):
    return await post_service.get_classroom_posts(classroom_id)

from pydantic import BaseModel
class CommentCreate(BaseModel):
    content: str

@router.post("/{post_id}/comments")
async def add_comment(post_id: str, payload: CommentCreate, current_user: UserPublic = Depends(get_current_user)):
    return await post_service.create_comment(post_id, current_user.id, current_user.name, payload.content)
