from fastapi import APIRouter
from database import get_database
from models.item import ItemCreate

router = APIRouter()


def _serialize_item(item: dict) -> dict:
    item["_id"] = str(item["_id"])
    return item

@router.get("/items")
async def get_items():
    db = get_database()
    items = await db["items"].find().to_list(100)
    return [_serialize_item(item) for item in items]


@router.post("/items", status_code=201)
async def create_item(item: ItemCreate):
    db = get_database()
    payload = item.model_dump(exclude_none=True)
    document = dict(payload)
    result = await db["items"].insert_one(document)
    return {**payload, "_id": str(result.inserted_id)}