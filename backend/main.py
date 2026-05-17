from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Response
from database import Database
from routes.items import router as items_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Database()
    print("App started, DB instance ready")

    yield

    if Database._client:
        Database._client.close()
    print("App stopped, DB connection closed")


app = FastAPI(lifespan=lifespan)
app.include_router(items_router)


@app.get("/")
async def home():
    return {
        "message": "Backend is running",
        "database_proof": "/db-status",
        "items": "/items",
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
