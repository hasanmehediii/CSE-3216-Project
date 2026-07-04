from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps student_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            except ValueError:
                pass

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            # Need to format datetime objects to strings before sending json
            # But we can just send it, FastAPI's json serialization might handle it, or we do it manually.
            # Convert ObjectIds and datetimes manually:
            import json
            from bson import ObjectId
            from datetime import datetime

            class CustomEncoder(json.JSONEncoder):
                def default(self, obj):
                    if isinstance(obj, ObjectId):
                        return str(obj)
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    return super().default(obj)
            
            text_data = json.dumps(message, cls=CustomEncoder)
            for connection in self.active_connections[user_id]:
                await connection.send_text(text_data)

manager = ConnectionManager()
