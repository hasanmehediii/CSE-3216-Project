from fastapi import HTTPException
from database import get_database
from datetime import datetime, timezone
from bson import ObjectId
from services.observer import ClassroomNoticeBoard, StudentNotifier

async def create_post(classroom_id: str, teacher_id: str, content: str, file_url: str = None, file_name: str = None):
    db = get_database()
    
    classroom = await db["classrooms"].find_one({"_id": ObjectId(classroom_id)})
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
        
    doc = {
        "classroom_id": classroom_id,
        "teacher_id": teacher_id,
        "content": content,
        "file_url": file_url,
        "file_name": file_name,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db["posts"].insert_one(doc)
    doc["_id"] = result.inserted_id

    # Observer Pattern in action
    notice_board = ClassroomNoticeBoard()
    
    # Attach all students in the classroom as observers
    for student_id in classroom.get("students", []):
        notifier = StudentNotifier(student_id)
        notice_board.attach(notifier)
        
    # Notify all attached observers
    await notice_board.notify(doc)
    
    doc["id"] = str(doc["_id"])
    if "_id" in doc:
        del doc["_id"]
    return doc

async def get_classroom_posts(classroom_id: str):
    db = get_database()
    cursor = db["posts"].find({"classroom_id": classroom_id}).sort("created_at", -1)
    posts = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        
        # Fetch comments for post
        comments_cursor = db["comments"].find({"post_id": str(doc["_id"])}).sort("created_at", 1)
        comments = []
        async for c_doc in comments_cursor:
            c_doc["id"] = str(c_doc["_id"])
            if "_id" in c_doc:
                del c_doc["_id"]
            comments.append(c_doc)
        doc["comments"] = comments
        
        if "_id" in doc:
            del doc["_id"]
        posts.append(doc)
    return posts

async def create_comment(post_id: str, user_id: str, user_name: str, content: str):
    db = get_database()
    
    doc = {
        "post_id": post_id,
        "user_id": user_id,
        "user_name": user_name,
        "content": content,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db["comments"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return doc
