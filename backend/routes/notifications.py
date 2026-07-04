from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from models.user import UserPublic
from services.auth_service import get_current_user
from database import get_database
from services.websocket_manager import manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(current_user: UserPublic = Depends(get_current_user)):
    db = get_database()
    cursor = db["notifications"].find({"student_id": current_user.id}).sort("created_at", -1)
    notifications = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        notifications.append(doc)
    return notifications

@router.put("/{notification_id}/read")
async def mark_notification_as_read(notification_id: str, current_user: UserPublic = Depends(get_current_user)):
    from bson import ObjectId
    db = get_database()
    await db["notifications"].update_one(
        {"_id": ObjectId(notification_id), "student_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
