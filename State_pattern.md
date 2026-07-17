# State Pattern — Live Exam Feature

## What is the State Pattern?

The **State Pattern** is a behavioral design pattern that allows an object to alter its behavior when its internal state changes. The object will appear to change its class.

Instead of using long `if/elif/else` chains to check the current state before performing any action, we encapsulate each state as its own class. Each state class defines what actions are allowed and what happens when they are triggered — including transitions to other states.

### Key Components

| Component | Role |
|-----------|------|
| **Context** | The object whose behavior changes. Holds a reference to the current State. Delegates all actions to it. |
| **State (Abstract)** | Defines the interface for all possible actions. Default behavior = "not allowed." |
| **Concrete States** | Implement specific behavior for each state. Override only the actions they permit. |

---

## How We Implemented It

### The Exam Lifecycle

An exam goes through 5 states:

```
Draft → Published → InProgress → Closed → Graded
```

```
┌─────────┐    publish()    ┌───────────┐   student enters   ┌─────────────┐
│  DRAFT  │ ──────────────→ │ PUBLISHED │ ────────────────→  │ IN_PROGRESS │
└─────────┘                 └───────────┘                    └─────────────┘
                                  │                                │
                                  │ close()                        │ close()
                                  ▼                                ▼
                            ┌──────────┐                     ┌──────────┐
                            │  CLOSED  │ ←───────────────────│  CLOSED  │
                            └──────────┘                     └──────────┘
                                  │
                                  │ assign_marks()
                                  ▼
                            ┌──────────┐    notify_results()
                            │  GRADED  │ ─────────────────→  Students notified
                            └──────────┘
```

### Where is the State Pattern Code?

**File: `backend/services/exam_states.py`**

This is the heart of the pattern. It contains:

---

### 1. Abstract State Class (`ExamState`)

```python
class ExamState(ABC):
    name: str = "unknown"

    def publish(self, context: "ExamContext") -> dict:
        raise HTTPException(400, f"Cannot publish exam in '{self.name}' state")

    def close(self, context: "ExamContext") -> dict:
        raise HTTPException(400, f"Cannot close exam in '{self.name}' state")

    def assign_marks(self, context: "ExamContext", marks_data: list) -> dict:
        raise HTTPException(400, f"Cannot assign marks in '{self.name}' state")

    def notify_results(self, context: "ExamContext") -> dict:
        raise HTTPException(400, f"Cannot notify results in '{self.name}' state")

    def start_student_session(self, context: "ExamContext", student_id: str) -> dict:
        raise HTTPException(400, f"Cannot enter exam in '{self.name}' state")

    def submit_answers(self, context: "ExamContext", student_id: str, answers: list) -> dict:
        raise HTTPException(400, f"Cannot submit answers in '{self.name}' state")
```

Every action raises a "not allowed" error by default. Concrete states override only the actions they support.

---

### 2. Concrete State Classes

#### `DraftState`
- **Allows:** `publish()` (if at least 1 question exists)
- **Transitions to:** `PublishedState`
- **Blocks:** Everything else

#### `PublishedState`
- **Allows:** `start_student_session()`, `close()`
- **Transitions to:** `InProgressState` (on first student entry), `ClosedState` (on close)

#### `InProgressState`
- **Allows:** `start_student_session()` (new students can still join), `submit_answers()`, `close()`
- **Transitions to:** `ClosedState` (on close)

#### `ClosedState`
- **Allows:** `assign_marks()`
- **Transitions to:** `GradedState`

#### `GradedState` (Terminal State)
- **Allows:** `notify_results()`
- **No further transitions**

---

### 3. ExamContext (The Context)

```python
class ExamContext:
    def __init__(self, exam_data: dict):
        self.exam_data = exam_data
        self._state = state_from_name(exam_data.get("state", "draft"))

    def transition_to(self, new_state: ExamState) -> None:
        self._state = new_state
        self.exam_data["state"] = new_state.name

    # Delegated actions
    def publish(self) -> dict:
        return self._state.publish(self)

    def close(self) -> dict:
        return self._state.close(self)

    def assign_marks(self, marks_data) -> dict:
        return self._state.assign_marks(self, marks_data)

    # ... etc
```

The `ExamContext`:
1. Loads the exam document from the database
2. Reconstructs the current state object from the state name stored in MongoDB
3. Delegates every action to the active state object
4. When a state transition happens, it updates both the in-memory state and the `exam_data["state"]` field

---

### 4. State Factory

```python
STATE_MAP = {
    "draft": DraftState,
    "published": PublishedState,
    "in_progress": InProgressState,
    "closed": ClosedState,
    "graded": GradedState,
}

def state_from_name(name: str) -> ExamState:
    return STATE_MAP[name]()
```

Since states are stored as strings in MongoDB, this factory reconstructs the correct state object when loading an exam from the DB.

---

## How the Service Layer Uses It

**File: `backend/services/exam_service.py`**

The service layer handles database I/O and timer validation, then delegates all state-specific logic to `ExamContext`.

### Example: Publishing an Exam

```python
async def publish_exam(exam_id: str, teacher_id: str):
    doc = await _get_exam_or_404(exam_id)           # Load from DB
    ctx = ExamContext(doc)                           # Create context with current state
    result = ctx.publish()                           # Delegate to state (DraftState.publish)
    await db["exams"].update_one(                    # Persist new state to DB
        {"_id": ObjectId(exam_id)},
        {"$set": {"state": ctx.state_name}},
    )
    return result
```

If the exam is NOT in `draft` state, `ctx.publish()` will raise an HTTP 400 error automatically because the base `ExamState.publish()` throws "Cannot publish in X state". No `if` statement needed!

### Example: Student Submitting Answers

```python
async def submit_answers(exam_id: str, student_id: str, answers: list):
    doc = await _get_exam_or_404(exam_id)
    ctx = ExamContext(doc)

    # Timer validation (server-side, not in state — needs DB access)
    session = await db["exam_sessions"].find_one(...)
    remaining = _remaining_seconds(session["started_at"], doc["duration_minutes"])
    if remaining <= 0:
        raise HTTPException(400, "Time expired — cannot submit")

    # State validation (only InProgressState allows this)
    ctx.submit_answers(student_id, answers)

    # Persist answers...
```

Timer validation is in the service layer (needs DB access), but state validation is in the state class. Clean separation of concerns.

---

## Why State Pattern is Better Than If/Else

### Without State Pattern (❌ Bad)
```python
async def publish_exam(exam_id):
    exam = load_from_db(exam_id)
    if exam["state"] == "draft":
        if len(exam["questions"]) == 0:
            raise Error("No questions")
        exam["state"] = "published"
        save_to_db(exam)
    elif exam["state"] == "published":
        raise Error("Already published")
    elif exam["state"] == "in_progress":
        raise Error("Exam is in progress")
    elif exam["state"] == "closed":
        raise Error("Exam is closed")
    elif exam["state"] == "graded":
        raise Error("Exam is already graded")
```

Every action would need this kind of chain. With 6 actions × 5 states = **30 branches** of if/elif logic scattered across your service.

### With State Pattern (✅ Good)
```python
async def publish_exam(exam_id):
    exam = load_from_db(exam_id)
    ctx = ExamContext(exam)
    result = ctx.publish()  # One line. State handles everything.
    save_to_db(exam)
```

Each state class is small, focused, and easy to test. Adding a new state (e.g., `ArchivedState`) means adding ONE class, not touching every function.

---

## Extensibility

The State Pattern makes this system easy to extend:

### Adding a New State
1. Create a new class (e.g., `ArchivedState`) extending `ExamState`
2. Override only the actions it allows
3. Add it to `STATE_MAP`
4. Add the transition in whichever existing state should lead to it

### Adding a New Action
1. Add a default method in `ExamState` (raises error)
2. Override it in the states where it's allowed
3. Add a delegation method in `ExamContext`

### No Existing Code Needs to Change
This follows the **Open/Closed Principle** — open for extension, closed for modification.

---

## File Map

| File | Pattern Role |
|------|-------------|
| `backend/services/exam_states.py` | **State Pattern core** — ExamState, 5 concrete states, ExamContext, state factory |
| `backend/services/exam_service.py` | **Client code** — Uses ExamContext to delegate state logic |
| `backend/routes/exams.py` | **API layer** — HTTP endpoints that call exam_service |
| `backend/models/exam.py` | **Data models** — Pydantic schemas for request/response |
| `frontend/src/pages/LiveExam.jsx` | **Student UI** — Exam-taking with timer, copy protection |
| `frontend/src/pages/ExamManage.jsx` | **Teacher UI** — State-aware management (different UI per state) |

---

## Integration with Other Patterns

| Pattern | Where | How It Connects |
|---------|-------|-----------------|
| **Singleton** | `database.py` | ExamService uses the singleton DB instance |
| **Factory** | `models/user.py` | User factory creates teacher/student objects that interact with exams |
| **Observer** | `services/observer.py` | When teacher clicks "Notify" in GradedState, the Observer pattern pushes marks to all students via WebSocket |
| **State** | `services/exam_states.py` | This feature — manages exam lifecycle |
