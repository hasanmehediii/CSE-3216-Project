from abc import ABC, abstractmethod
from typing import List, Any
from database import get_database
from datetime import datetime, timezone

class Observer(ABC):
    @abstractmethod
    async def update(self, post_data: dict) -> None:
        pass

class Subject(ABC):
    @abstractmethod
    def attach(self, observer: Observer) -> None:
        pass

    @abstractmethod
    def detach(self, observer: Observer) -> None:
        pass

    @abstractmethod
    async def notify(self, post_data: dict) -> None:
        pass

class StudentNotifier(Observer):
    def __init__(self, student_id: str):
        self.student_id = student_id

    async def update(self, post_data: dict) -> None:
        db = get_database()
        notification = {
            "student_id": self.student_id,
            "classroom_id": post_data["classroom_id"],
            "post_id": str(post_data["_id"]),
            "message": f"New post in your classroom: {post_data.get('content', '')[:30]}...",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db["notifications"].insert_one(notification)
        
        # Enforce exactly at most 3 notifications per student
        cursor = db["notifications"].find({"student_id": self.student_id}).sort("created_at", -1)
        all_notifs = []
        async for n in cursor:
            all_notifs.append(n)
            
        if len(all_notifs) > 3:
            ids_to_delete = [n["_id"] for n in all_notifs[3:]]
            if ids_to_delete:
                await db["notifications"].delete_many({"_id": {"$in": ids_to_delete}})
        
        # We will also trigger the WebSocket connection here if we want to
        # But to avoid circular imports, we can dispatch to a global websocket manager.
        from services.websocket_manager import manager
        
        # Ensure we remove _id before sending via WebSocket to avoid serialization errors
        notification["id"] = str(notification["_id"])
        if "_id" in notification:
            del notification["_id"]

        await manager.send_personal_message(
            {"type": "new_notification", "data": notification},
            self.student_id
        )

class ClassroomNoticeBoard(Subject):
    def __init__(self):
        self._observers: List[Observer] = []

    def attach(self, observer: Observer) -> None:
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    async def notify(self, post_data: dict) -> None:
        for observer in self._observers:
            await observer.update(post_data)
