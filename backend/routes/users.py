from fastapi import APIRouter, Depends

from controllers.user_controller import visible_users
from services.auth_service import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/visible")
async def get_visible_users(current_user=Depends(get_current_user)):
    return await visible_users(current_user)
