from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from database import Database
from middlewares.rate_limit import RateLimitMiddleware
from routes.auth import router as auth_router
from routes.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Database()
    print("App started, DB instance ready")

    yield

    if Database._client:
        Database._client.close()
    print("App stopped, DB connection closed")


app = FastAPI(lifespan=lifespan, title="Campus Factory Pattern API")
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(users_router)


@app.get("/")
async def home():
    return {
        "message": "Backend is running",
        "database_proof": "/db-status",
        "auth": "/auth/login",
        "visible_users": "/users/visible",
        "docs": "/docs",
    }


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


@app.get("/db-status")
async def db_status():
    try:
        db = Database().get_db()
        result = await db.command("ping")
        return {
            "status": "connected",
            "database": db.name,
            "ping": result.get("ok") == 1.0,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {exc}",
        ) from exc
