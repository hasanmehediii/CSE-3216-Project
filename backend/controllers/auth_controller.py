from fastapi import Response, status

from models.user import UserLogin, UserRegister
from services.auth_service import authenticate_user, register_user


def _attach_token_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24,
    )


async def register(payload: UserRegister, response: Response) -> dict:
    user = await register_user(payload)
    login_payload = UserLogin(email=payload.email, password=payload.password)
    _, token = await authenticate_user(login_payload)
    _attach_token_cookie(response, token)
    return {"user": user, "access_token": token, "token_type": "bearer"}


async def login(payload: UserLogin, response: Response) -> dict:
    user, token = await authenticate_user(payload)
    _attach_token_cookie(response, token)
    return {"user": user, "access_token": token, "token_type": "bearer"}


async def logout(response: Response) -> dict:
    response.delete_cookie("access_token")
    response.status_code = status.HTTP_200_OK
    return {"message": "Logged out"}
