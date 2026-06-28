from fastapi import APIRouter, Depends, Response

from controllers import auth_controller
from models.user import UserLogin, UserRegister
from services.auth_service import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", status_code=201)
async def register(payload: UserRegister, response: Response):
    return await auth_controller.register(payload, response)


@router.post("/login")
async def login(payload: UserLogin, response: Response):
    return await auth_controller.login(payload, response)


@router.post("/logout")
async def logout(response: Response):
    return await auth_controller.logout(response)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"user": current_user}
