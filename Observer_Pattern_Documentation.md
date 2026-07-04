# Observer Pattern Implementation - University Management System

This document outlines how the **Observer Design Pattern** is used to handle real-time notifications for the Classroom Notice Board. 

## 1. How It Works (User Perspective)

From the project's user interface, the flow looks like this:
1. **Teacher Action**: A teacher goes to their Dashboard, selects a Classroom, and publishes a new post (e.g., "Assignment 1 Due Tomorrow"). They can also attach a PDF file.
2. **Instant Delivery**: Without the teacher doing anything else, the system automatically figures out which students are enrolled in that specific classroom.
3. **Student Experience**: 
   - If a student is **online**, their browser (via WebSockets) immediately receives the notification and a red badge appears on their notification bell icon without them refreshing the page.
   - If the student is **offline**, the notification is safely saved in the database. When they log in next time, they will see it waiting for them in their dropdown menu.

---

## 2. Technical Implementation (Observer Pattern)

To achieve this cleanly, we used the **Observer Pattern**. This pattern decouples the object that *creates* the data (the Notice Board) from the objects that *react* to the data (the Students/Notifiers). 

### The Components

The code for this pattern is primarily located in `backend/services/observer.py`.

#### A. The Interfaces (`Subject` and `Observer`)
We start by defining the abstract base classes. This ensures our system strictly follows the design pattern and is easily extensible.

```python
from abc import ABC, abstractmethod

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
```

#### B. The Subject (`ClassroomNoticeBoard`)
The `ClassroomNoticeBoard` acts as the Subject. Its only job is to maintain a list of attached observers and notify them when something happens. It doesn't need to know *what* the observers do with the notification.

```python
class ClassroomNoticeBoard(Subject):
    def __init__(self):
        self._observers = []

    def attach(self, observer: Observer) -> None:
        self._observers.append(observer)

    def detach(self, observer: Observer) -> None:
        self._observers.remove(observer)

    async def notify(self, post_data: dict) -> None:
        # Broadcast the data to all attached observers
        for observer in self._observers:
            await observer.update(post_data)
```

#### C. The Observer (`StudentNotifier`)
The `StudentNotifier` acts as the concrete Observer. When `update()` is called, it executes the actual business logic:
1. Saves a record to the MongoDB `notifications` collection.
2. Triggers the WebSocket manager to push the live event to the frontend.

```python
class StudentNotifier(Observer):
    def __init__(self, student_id: str):
        self.student_id = student_id

    async def update(self, post_data: dict) -> None:
        db = get_database()
        
        # 1. Save to Database (Persistence)
        notification = {
            "student_id": self.student_id,
            "classroom_id": post_data["classroom_id"],
            "post_id": str(post_data["_id"]),
            "message": f"New post: {post_data.get('content', '')[:30]}...",
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db["notifications"].insert_one(notification)
        
        # 2. Push to WebSocket (Real-time update)
        from services.websocket_manager import manager
        await manager.send_personal_message(
            {"type": "new_notification", "data": notification},
            self.student_id
        )
```

---

## 3. Integrating the Pattern in Business Logic

When a teacher creates a post in `backend/services/post_service.py`, we instantiate the Subject, attach all the relevant Observers, and trigger the notification.

```python
# From post_service.py -> create_post()

# 1. Instantiate the Subject
notice_board = ClassroomNoticeBoard()

# 2. Find all students in this classroom and attach them as Observers
for student_id in classroom.get("students", []):
    notifier = StudentNotifier(student_id)
    notice_board.attach(notifier)
    
# 3. Notify everyone!
await notice_board.notify(doc)
```

### Why use this pattern here?
1. **Loose Coupling**: The `post_service.py` is responsible for saving posts. It shouldn't care about WebSockets or Notification database schemas. The Observer Pattern cleanly separates these concerns.
2. **Extensibility**: If the University decides they want to send **Email Notifications** in the future, we simply create an `EmailNotifier(Observer)` class and attach it to the `ClassroomNoticeBoard`. We won't need to change a single line of code in the core posting logic!
