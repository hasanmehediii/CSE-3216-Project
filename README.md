# Smart Classroom Management System

This project is a comprehensive Smart Classroom and University Management System built with a **FastAPI** backend and a **React/Vite** frontend. It facilitates teacher-student interactions, classroom management, real-time notice boards, and a robust live exam feature.

## Features
- **Role-Based Access Control**: Different access levels and features for Students, Teachers, and Staff.
- **Classroom Management**: Teachers can create classrooms and students can easily enroll.
- **Real-time Notice Board**: Live updates via WebSockets when teachers publish posts, announcements, or exam results.
- **Live Exam System**: Complete exam lifecycle management with server-side timer validation and secure answer submission.

## Tech Stack
- **Backend**: Python, FastAPI, Motor (Async MongoDB Driver)
- **Frontend**: React, Vite, React Router, Tailwind/Vanilla CSS
- **Database**: MongoDB

---

## Design Patterns Implemented

This project extensively uses Gang of Four (GoF) design patterns to solve common software design challenges, ensuring the codebase remains scalable, maintainable, and loosely coupled.

### 1. Singleton Pattern
**Location**: `backend/database.py`

**How it's used**: The Singleton pattern is used to manage the MongoDB database connection. It ensures that only a single instance of `AsyncIOMotorClient` is created and reused throughout the application's lifecycle. This prevents the overhead of establishing multiple redundant connections to the database and centralizes database configuration.

### 2. Factory Method Pattern
**Location**: `backend/models/user.py` (`CampusUserFactory`)

**How it's used**: The Factory Method pattern encapsulates the instantiation of different user roles (`StudentUser`, `TeacherUser`, `StaffUser`). Instead of scattering `if/else` conditions throughout the authentication and user creation codebase, the system delegates creation to `CampusUserFactory.create()`. This adheres to the Open/Closed Principle—adding a new user role (e.g., `AdminUser`) only requires creating a new subclass and registering it in the factory, without modifying existing client code.

### 3. Observer Pattern
**Location**: `backend/services/observer.py` (integrated in `post_service.py` & `exam_service.py`)

**How it's used**: The Observer pattern powers the real-time notification system. 
- **Subject**: `ClassroomNoticeBoard`
- **Observer**: `StudentNotifier`

When a teacher publishes a new post or releases exam grades, the `ClassroomNoticeBoard` (Subject) broadcasts the event to all attached `StudentNotifier`s (Observers). The observers then save the notification to the database and trigger real-time updates via WebSockets. This neatly decouples the core posting logic from the notification and websocket delivery mechanisms.

### 4. State Pattern
**Location**: `backend/services/exam_states.py` & `backend/services/exam_service.py`

**How it's used**: The State pattern governs the complex lifecycle of the Live Exam feature. An exam transitions through five distinct states: `Draft` → `Published` → `InProgress` → `Closed` → `Graded`. 

Instead of writing massive, fragile `if/elif` chains in the service layer to check what actions are allowed, each state is encapsulated in its own distinct class (e.g., `DraftState`, `PublishedState`) that extends an abstract `ExamState` base class. The `ExamContext` delegates action requests (like `publish()`, `submit_answers()`, `close()`) to the active state object. If an action is invalid for the current state, it is automatically blocked by the base class. This makes extending exam behaviors or adding new states safe, modular, and adhering strictly to the Open/Closed Principle.

---

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment.
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in your MongoDB credentials (`MONGODB_URI` and `DB_NAME`).
6. Run the server: `fastapi dev main.py`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`
