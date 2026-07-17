import secrets
from fastapi import HTTPException, status
from database import get_database
from models.classroom import ClassroomCreate
from datetime import datetime, timezone
from bson import ObjectId

async def create_classroom(payload: ClassroomCreate, teacher_id: str):
    db = get_database()
    join_pin = ''.join(secrets.choice("0123456789") for _ in range(6))
    
    doc = {
        "name": payload.name,
        "teacher_id": teacher_id,
        "join_pin": join_pin,
        "students": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db["classrooms"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return doc

async def get_teacher_classrooms(teacher_id: str):
    db = get_database()
    cursor = db["classrooms"].find({"teacher_id": teacher_id})
    classrooms = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        classrooms.append(doc)
    return classrooms

async def get_student_classrooms(student_id: str):
    db = get_database()
    cursor = db["classrooms"].find({"students": student_id})
    classrooms = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        classrooms.append(doc)
    return classrooms

async def get_classroom_by_id(classroom_id: str):
    db = get_database()
    doc = await db["classrooms"].find_one({"_id": ObjectId(classroom_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Classroom not found")
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

async def get_classroom_members(classroom_id: str):
    db = get_database()
    doc = await db["classrooms"].find_one({"_id": ObjectId(classroom_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Classroom not found")

    # Resolve teacher
    teacher_doc = await db["users"].find_one({"_id": ObjectId(doc["teacher_id"])})
    teacher = None
    if teacher_doc:
        teacher = {
            "id": str(teacher_doc["_id"]),
            "name": teacher_doc.get("name", "Unknown"),
            "email": teacher_doc.get("email", ""),
            "department": teacher_doc.get("department"),
            "role": "teacher",
        }

    # Resolve students
    students = []
    for sid in doc.get("students", []):
        try:
            student_doc = await db["users"].find_one({"_id": ObjectId(sid)})
            if student_doc:
                students.append({
                    "id": str(student_doc["_id"]),
                    "name": student_doc.get("name", "Unknown"),
                    "email": student_doc.get("email", ""),
                    "department": student_doc.get("department"),
                    "role": "student",
                })
        except Exception:
            continue

    return {"teacher": teacher, "students": students}


async def join_classroom_by_pin(pin: str, student_id: str):
    db = get_database()
    doc = await db["classrooms"].find_one({"join_pin": pin})
    if not doc:
        raise HTTPException(status_code=404, detail="Invalid PIN")
        
    if student_id in doc.get("students", []):
        raise HTTPException(status_code=400, detail="Already in classroom")
        
    await db["classrooms"].update_one(
        {"_id": doc["_id"]},
        {"$push": {"students": student_id}}
    )
    return {"message": "Successfully joined classroom"}
