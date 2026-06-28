import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException, Request, status

from database import get_database
from models.user import CampusUserFactory, UserLogin, UserPublic, UserRegister


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{_b64url_encode(salt)}:{_b64url_encode(digest)}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_text, digest_text = password_hash.split(":", 1)
        salt = _b64url_decode(salt_text)
        expected = _b64url_decode(digest_text)
    except ValueError:
        return False

    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(payload: dict) -> str:
    secret = os.getenv("JWT_SECRET", "change-this-secret")
    algorithm = os.getenv("JWT_ALG", "HS256")
    expire_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)

    header = {"alg": algorithm, "typ": "JWT"}
    body = {**payload, "exp": int(expires_at.timestamp())}
    unsigned = f"{_b64url_encode(json.dumps(header).encode())}.{_b64url_encode(json.dumps(body).encode())}"
    signature = hmac.new(secret.encode("utf-8"), unsigned.encode("ascii"), hashlib.sha256).digest()
    return f"{unsigned}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> dict:
    secret = os.getenv("JWT_SECRET", "change-this-secret")
    try:
        header_text, body_text, signature_text = token.split(".")
        unsigned = f"{header_text}.{body_text}"
        expected = hmac.new(secret.encode("utf-8"), unsigned.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_decode(signature_text), expected):
            raise ValueError("Invalid token signature")

        payload = json.loads(_b64url_decode(body_text))
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("Expired token")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token") from exc


def user_to_public(document: dict) -> UserPublic:
    return UserPublic(
        id=str(document["_id"]),
        name=document["name"],
        email=document["email"],
        role=document["role"],
        department=document.get("department"),
        title=document.get("title", document["role"].title()),
    )


async def register_user(payload: UserRegister) -> UserPublic:
    db = get_database()
    password_hash = hash_password(payload.password)
    user = CampusUserFactory.create(
        payload.role,
        payload.name,
        str(payload.email),
        password_hash,
        payload.department,
    )
    document = user.to_document()

    if await db["users"].find_one({"email": document["email"]}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    result = await db["users"].insert_one(document)
    document["_id"] = result.inserted_id
    return user_to_public(document)


async def authenticate_user(payload: UserLogin) -> tuple[UserPublic, str]:
    db = get_database()
    document = await db["users"].find_one({"email": str(payload.email).lower()})
    if not document or not verify_password(payload.password, document.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user = user_to_public(document)
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return user, token


async def get_current_user(request: Request) -> UserPublic:
    token = request.cookies.get("access_token")
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    payload = decode_access_token(token)
    db = get_database()
    document = await db["users"].find_one({"_id": ObjectId(payload["sub"])})
    if not document:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user_to_public(document)

