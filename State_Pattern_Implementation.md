# State Pattern Implementation - Live Exam Feature

## State Pattern কী?

State Pattern একটি Behavioral Design Pattern। কোনো object-এর internal state পরিবর্তন হলে সেই object-এর behavior-ও পরিবর্তন হয়। অর্থাৎ একই object ভিন্ন state-এ ভিন্নভাবে কাজ করে।

সহজভাবে বললে, অনেকগুলো `if/elif/else` দিয়ে বারবার state check করার বদলে প্রতিটি state-কে আলাদা class হিসেবে রাখা হয়। তারপর context object বর্তমান state অনুযায়ী action-টি সেই state class-এর কাছে delegate করে।

এই project-এ State Pattern ব্যবহার করা হয়েছে **Live Exam lifecycle** control করার জন্য।

---

## এই Project-এ State Pattern কোথায় ব্যবহার করা হয়েছে?

State Pattern-এর main implementation আছে:

- `backend/services/exam_states.py`
- `backend/services/exam_service.py`
- `backend/models/exam.py`
- `backend/routes/exams.py`
- `frontend/src/pages/ExamManage.jsx`
- `frontend/src/pages/LiveExam.jsx`
- `frontend/src/pages/Classroom.jsx`

এই pattern মূলত exam-এর state অনুযায়ী কোন action allowed হবে, কোন action blocked হবে, এবং কোন action-এর পর exam কোন নতুন state-এ যাবে তা manage করে।

---

## Exam Lifecycle

এই project-এ একটি exam মোট ৫টি state-এর মধ্য দিয়ে যায়:

```text
Draft -> Published -> InProgress -> Closed -> Graded
```

State transition flow:

```text
Draft
  |
  | publish()
  v
Published
  |
  | first student enters
  v
InProgress
  |
  | close()
  v
Closed
  |
  | assign_marks()
  v
Graded
  |
  | notify_results()
  v
Students notified
```

আরেকটি valid transition হলো:

```text
Published -> Closed
```

অর্থাৎ teacher চাইলে exam শুরু হওয়ার আগেই published exam close করতে পারে।

---

## State Pattern কীভাবে কাজ করছে?

### 1. Abstract State: `ExamState`

File: `backend/services/exam_states.py`

`ExamState` হলো base class। এখানে সব possible action define করা আছে:

- `publish()`
- `close()`
- `assign_marks()`
- `notify_results()`
- `start_student_session()`
- `submit_answers()`

Base class-এ প্রতিটি action default হিসেবে HTTP 400 error throw করে। এর মানে হলো, কোনো state যদি নির্দিষ্ট action override না করে, তাহলে সেই action ঐ state-এ allowed না।

উদাহরণ:

```python
def publish(self, context: "ExamContext") -> dict:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Cannot publish exam in '{self.name}' state",
    )
```

এটার সুবিধা হলো invalid action manually সব জায়গায় check করতে হয় না। ভুল state-এ action call হলে base class নিজেই block করে।

---

### 2. Concrete States

Project-এ ৫টি concrete state class আছে।

| State Class | State Name | Allowed Action | Next State |
|---|---|---|---|
| `DraftState` | `draft` | `publish()` | `published` |
| `PublishedState` | `published` | `start_student_session()`, `close()` | `in_progress`, `closed` |
| `InProgressState` | `in_progress` | `start_student_session()`, `submit_answers()`, `close()` | `closed` |
| `ClosedState` | `closed` | `assign_marks()` | `graded` |
| `GradedState` | `graded` | `notify_results()` | terminal state |

#### `DraftState`

Exam create করার পর initial state হয় `draft`। এই অবস্থায় teacher question add/edit করতে পারে। `publish()` call করলে আগে check করা হয় exam-এ question আছে কি না। question না থাকলে publish করা যায় না।

```python
if not context.exam_data.get("questions"):
    raise HTTPException(..., detail="Cannot publish an exam with no questions")
context.transition_to(PublishedState())
```

#### `PublishedState`

Exam student-দের কাছে visible হয়। কোনো student প্রথমবার exam-এ enter করলে state `published` থেকে `in_progress` হয়ে যায়। Teacher চাইলে এই state থেকেও exam close করতে পারে।

#### `InProgressState`

Exam চলমান অবস্থায় থাকে। Student submit করতে পারে, নতুন student enter করতে পারে, এবং teacher exam close করতে পারে। Timer validation এখানে করা হয়নি, কারণ timer check করার জন্য database session data লাগে। তাই timer logic `exam_service.py`-তে আছে।

#### `ClosedState`

Exam close হলে আর submission নেওয়া হয় না। এই state-এ teacher marks assign করতে পারে। Marks assign হলে state `graded` হয়।

#### `GradedState`

এটি terminal state। এখানে result notify করা যায়। Notify action-এর সময় Observer Pattern ব্যবহার করে student-দের notification পাঠানো হয়।

---

### 3. Context: `ExamContext`

`ExamContext` হলো State Pattern-এর Context class। Client code সরাসরি concrete state class ব্যবহার করে না। Client code `ExamContext`-এর method call করে, আর `ExamContext` current state object-এর কাছে কাজ delegate করে।

```python
class ExamContext:
    def __init__(self, exam_data: dict):
        self.exam_data = exam_data
        self._state: ExamState = state_from_name(exam_data.get("state", "draft"))

    def transition_to(self, new_state: ExamState) -> None:
        self._state = new_state
        self.exam_data["state"] = new_state.name

    def publish(self) -> dict:
        return self._state.publish(self)
```

এখানে `exam_data["state"]` MongoDB থেকে string হিসেবে আসে, যেমন `draft`, `published`, `closed`। `ExamContext` সেই string দেখে actual state object তৈরি করে।

---

### 4. State Factory: `state_from_name()`

MongoDB-তে state object store করা হয় না, শুধু state name string store করা হয়। তাই database থেকে exam load করার পর state object reconstruct করার জন্য factory ব্যবহার করা হয়েছে।

```python
STATE_MAP = {
    "draft": DraftState,
    "published": PublishedState,
    "in_progress": InProgressState,
    "closed": ClosedState,
    "graded": GradedState,
}

def state_from_name(name: str) -> ExamState:
    cls = STATE_MAP.get(name)
    if cls is None:
        raise ValueError(f"Unknown exam state: {name}")
    return cls()
```

এটি State Pattern-এর সাথে ছোট একটি Factory-style helper হিসেবে কাজ করছে।

---

## Service Layer-এ কীভাবে ব্যবহার হয়েছে?

File: `backend/services/exam_service.py`

Service layer database operation, permission check, timer validation, session creation, marks save ইত্যাদি কাজ করে। কিন্তু state-specific decision `ExamContext`-এর কাছে delegate করে।

### Exam Create

`create_exam()` method exam create করার সময় initial state set করে:

```python
"state": "draft"
```

অর্থাৎ সব exam প্রথমে draft থাকে।

### Publish Exam

`publish_exam()` method:

```python
ctx = ExamContext(doc)
result = ctx.publish()
await db["exams"].update_one(
    {"_id": ObjectId(exam_id)},
    {"$set": {"state": ctx.state_name}},
)
```

যদি exam `draft` state-এ থাকে, তাহলে `DraftState.publish()` চলবে এবং state `published` হবে। অন্য কোনো state হলে base `ExamState.publish()` error throw করবে।

### Student Enter Exam

`enter_exam()` method-এ:

```python
state_result = ctx.start_student_session(student_id)
```

যদি exam `published` থাকে, first student enter করার সাথে সাথে state `in_progress` হয়ে যায়। যদি already `in_progress` থাকে, তাহলে নতুন student join করতে পারে। কিন্তু `draft`, `closed`, বা `graded` state-এ student enter করতে পারবে না।

### Submit Answers

`submit_answers()` method আগে session আছে কি না, already submitted কি না, timer expire হয়েছে কি না এগুলো check করে। তারপর:

```python
ctx.submit_answers(student_id, answers)
```

Only `InProgressState` এই action allow করে। তাই closed exam-এ submission দেওয়া যাবে না।

### Close Exam

`close_exam()` method:

```python
result = ctx.close()
```

`PublishedState` এবং `InProgressState` close allow করে। অন্য state-এ close blocked।

### Assign Marks

`assign_marks()` method:

```python
result = ctx.assign_marks(marks_list)
```

Only `ClosedState` marks assign allow করে। Marks assign হওয়ার পর state `graded` হয়।

### Notify Results

`notify_results()` method:

```python
result = ctx.notify_results()
```

Only `GradedState` result notification allow করে। এরপর `ClassroomNoticeBoard` এবং `StudentNotifier` ব্যবহার করে Observer Pattern-এর মাধ্যমে notification পাঠানো হয়।

---

## API Layer-এ ব্যবহার

File: `backend/routes/exams.py`

Routes সরাসরি state logic জানে না। Routes শুধু request নেয়, role check করে, তারপর service call করে।

Important endpoints:

| Endpoint | Role | State Pattern Action |
|---|---|---|
| `PUT /exams/{exam_id}/publish` | teacher | `ctx.publish()` |
| `POST /exams/{exam_id}/enter` | student | `ctx.start_student_session()` |
| `POST /exams/{exam_id}/submit` | student | `ctx.submit_answers()` |
| `PUT /exams/{exam_id}/close` | teacher | `ctx.close()` |
| `PUT /exams/{exam_id}/marks` | teacher | `ctx.assign_marks()` |
| `PUT /exams/{exam_id}/notify` | teacher | `ctx.notify_results()` |

এই design-এর কারণে API layer clean আছে। State validation route file-এ ছড়িয়ে নেই।

---

## Model Layer-এ ব্যবহার

File: `backend/models/exam.py`

Exam state-এর allowed values Pydantic model-এ `Literal` দিয়ে define করা হয়েছে:

```python
ExamStateName = Literal["draft", "published", "in_progress", "closed", "graded"]
```

এতে response model-এ state value controlled থাকে। ভুল state value accidentally return করার chance কমে।

---

## Frontend-এ State Pattern-এর প্রভাব

Frontend নিজে State Pattern implement করেনি, কিন্তু backend state অনুযায়ী UI change করছে।

### Teacher UI: `frontend/src/pages/ExamManage.jsx`

এই page-এ exam state অনুযায়ী আলাদা action button এবং view দেখানো হয়।

- `draft`: question editor এবং Publish Exam button
- `published`: Close Exam button
- `in_progress`: live sessions এবং Close Exam button
- `closed`: submissions দেখা এবং marks assign
- `graded`: result view এবং Notify Students button

Code-এ দেখা যায়:

```jsx
{exam.state === 'draft' && (...)}
{(exam.state === 'published' || exam.state === 'in_progress') && (...)}
{exam.state === 'closed' && (...)}
{exam.state === 'graded' && (...)}
```

### Student UI: `frontend/src/pages/LiveExam.jsx`

Student exam page load হলে:

```jsx
await apiRequest(`/exams/${examId}/enter`, { method: 'POST' });
```

তারপর submit করার সময়:

```jsx
await apiRequest(`/exams/${examId}/submit`, { method: 'POST', ... });
```

Backend state allow করলে student enter/submit করতে পারে। অন্যথায় API error দেয়।

### Classroom UI: `frontend/src/pages/Classroom.jsx`

Classroom page exam list দেখায় এবং `exam.state` অনুযায়ী status badge/action determine করে। Student শুধুমাত্র `published`, `in_progress`, `closed`, `graded` exams দেখতে পারে; draft exams student-এর কাছে hidden থাকে। এই filtering backend `get_classroom_exams()` method-এ করা হয়েছে।

---

## State Pattern ব্যবহার করার Benefit

### 1. If/Else কমেছে

State Pattern না থাকলে প্রতিটি action-এর জন্য এমন logic লিখতে হতো:

```python
if exam["state"] == "draft":
    ...
elif exam["state"] == "published":
    ...
elif exam["state"] == "in_progress":
    ...
```

এই project-এ ৫টি state এবং ৬টি action আছে। Pattern ছাড়া প্রায় ৩০টি branch বিভিন্ন service function-এ ছড়িয়ে যেত।

### 2. Single Responsibility ভালোভাবে maintain হয়েছে

`ExamState` এবং concrete state class শুধু state behavior handle করছে। `exam_service.py` database, permission, timer, session, marks persistence handle করছে।

### 3. Invalid Action Automatically Block হয়

যদি কেউ closed exam-এ submit করতে চায়, `ClosedState` submit override করেনি। তাই base class automatically error throw করবে।

### 4. Code Extend করা সহজ

নতুন state যেমন `ArchivedState` add করতে হলে:

1. নতুন class তৈরি করতে হবে।
2. allowed action override করতে হবে।
3. `STATE_MAP`-এ add করতে হবে।
4. প্রয়োজনীয় transition define করতে হবে।

পুরো service layer rewrite করতে হবে না।

### 5. Business Rule পরিষ্কার

কোন state-এ কোন action allowed তা table বা class দেখলেই বোঝা যায়। যেমন `ClosedState` দেখলেই বোঝা যায়, closed exam-এ only marks assign করা যায়।

### 6. Frontend predictable হয়েছে

Backend state consistent থাকায় frontend সহজে `exam.state` দেখে button, badge, page section show/hide করতে পারছে।

---

## Disadvantages / Limitations

### 1. Class সংখ্যা বেড়ে যায়

Simple system হলে State Pattern over-engineering হতে পারে। এখানে ৫টি state-এর জন্য ৫টি concrete class এবং একটি context class তৈরি হয়েছে।

### 2. Transition flow বুঝতে প্রথমে সময় লাগে

নতুন developer-কে `exam_states.py`, `exam_service.py`, এবং API route একসাথে দেখে flow বুঝতে হবে।

### 3. Database persistence আলাদা করে handle করতে হয়

`ExamContext.transition_to()` in-memory `exam_data["state"]` update করে। কিন্তু MongoDB-তে save করার জন্য service layer-এ আলাদা `update_one()` call করতে হয়। কোনো developer যদি persist করতে ভুলে যায়, state transition database-এ reflect হবে না।

### 4. কিছু validation এখনও service layer-এ আছে

Timer validation, permission check, student enrollment check, existing session check database access-এর উপর depend করে। তাই এগুলো state class-এ রাখা হয়নি। এতে logic পুরোপুরি এক জায়গায় নেই, তবে separation of concerns ঠিক আছে।

### 5. নতুন action add করলে একাধিক জায়গায় update লাগে

নতুন action add করতে হলে:

- `ExamState`-এ default method
- allowed concrete state class-এ override
- `ExamContext`-এ delegation method
- service এবং route layer
- frontend action button

তাই pattern extensible হলেও discipline দরকার।

---

## Real Life Example

State Pattern বোঝার জন্য একটি real-life example ধরা যাক: **Online Food Delivery Order**।

একটি order বিভিন্ন state-এর মধ্য দিয়ে যায়:

```text
Placed -> Confirmed -> Preparing -> OutForDelivery -> Delivered -> Cancelled
```

প্রতিটি state-এ allowed action আলাদা:

| Order State | Allowed Action | Blocked Action |
|---|---|---|
| `Placed` | cancel করা, restaurant confirm করা | deliver করা |
| `Confirmed` | preparing শুরু করা | payment refund করা |
| `Preparing` | delivery rider assign করা | item edit করা |
| `OutForDelivery` | delivered mark করা | order edit করা |
| `Delivered` | rating দেওয়া | cancel করা |
| `Cancelled` | refund process করা | deliver করা |

যদি State Pattern ব্যবহার করা হয়, তাহলে প্রতিটি order state আলাদা class হতে পারে:

- `PlacedState`
- `ConfirmedState`
- `PreparingState`
- `OutForDeliveryState`
- `DeliveredState`
- `CancelledState`

User যদি delivered order cancel করতে চায়, তাহলে `DeliveredState.cancel()` allowed না থাকায় system automatically block করবে। আবার `PlacedState.cancel()` allowed থাকলে order cancel হবে।

এই project-এর Live Exam feature-ও একইভাবে কাজ করে। যেমন:

- Food order-এর `Placed` state project-এর `draft` exam-এর মতো।
- Food order-এর `OutForDelivery` state project-এর `in_progress` exam-এর মতো।
- Food order-এর `Delivered` state project-এর `graded` exam-এর মতো terminal state।

অর্থাৎ object একই থাকে, কিন্তু state বদলালে তার behavior বদলে যায়।

---

## Real Life Example দিয়ে Advantages

### 1. Business rule পরিষ্কার থাকে

Food delivery system-এ delivered order cancel করা যাবে না। Exam system-এ closed exam submit করা যাবে না। State Pattern থাকলে এই rule নির্দিষ্ট state class-এর মধ্যে থাকে, ছড়িয়ে যায় না।

### 2. ভুল action কমে

Customer যদি already delivered order cancel করতে চায়, system block করবে। একইভাবে student যদি `closed` exam-এ answer submit করতে চায়, base `ExamState` error throw করে।

### 3. নতুন state add করা সহজ

Food delivery system-এ `RefundedState` add করতে হলে নতুন state class add করা যায়। এই project-এ future-এ `ArchivedState` বা `ReviewState` add করাও একইভাবে সম্ভব।

### 4. Maintenance সহজ হয়

Order flow বা exam flow change হলে developer নির্দিষ্ট state class modify করতে পারে। পুরো service layer ঘেঁটে বড় `if/else` chain update করতে হয় না।

---

## Real Life Example দিয়ে Disadvantages

### 1. ছোট system-এ বেশি class লাগে

যদি food delivery app-এ শুধু দুইটা state থাকে, যেমন `active` এবং `done`, তাহলে আলাদা state class বানানো unnecessary হতে পারে। একইভাবে খুব simple exam system হলে State Pattern over-engineering হতে পারত।

### 2. Flow trace করতে একাধিক file দেখতে হয়

Food order cancel কেন blocked হলো বুঝতে `DeliveredState` দেখতে হবে। এই project-এ submit কেন blocked হলো বুঝতে `ExamContext`, current state class, এবং `exam_service.py` একসাথে দেখতে হতে পারে।

### 3. State transition persist করতে ভুল হতে পারে

Food order `PreparingState` থেকে `OutForDeliveryState` হলো, কিন্তু database update না করলে user পুরনো status দেখবে। এই project-এও `ExamContext.transition_to()` শুধু in-memory state update করে; MongoDB update করতে service layer-এর `update_one()` দরকার।

---

## এই Project-এ State Pattern কেন উপযুক্ত?

Live Exam feature একটি lifecycle-driven feature। এখানে exam-এর behavior পুরোপুরি current state-এর উপর depend করে:

- Draft exam publish করা যায়, কিন্তু submit করা যায় না।
- Published exam enter করা যায়, কিন্তু marks assign করা যায় না।
- In-progress exam submit করা যায়, কিন্তু notify করা যায় না।
- Closed exam grade করা যায়, কিন্তু submit করা যায় না।
- Graded exam notify করা যায়, কিন্তু আবার close করা যায় না।

এই rules যদি service layer-এ `if/else` দিয়ে লেখা হতো, code fragile এবং hard to maintain হয়ে যেত। State Pattern ব্যবহার করার ফলে প্রতিটি state নিজের allowed behavior নিজেই define করছে।

---

## Summary

এই project-এ State Pattern ব্যবহার করা হয়েছে Live Exam feature-এর lifecycle manage করার জন্য। Core implementation `backend/services/exam_states.py`-তে আছে। `ExamContext` current state hold করে এবং action delegate করে। Concrete state classes decide করে কোন action allowed এবং action শেষে কোন state-এ transition হবে।

এই design backend code clean করেছে, invalid transition prevent করেছে, frontend state-aware UI তৈরি করতে সাহায্য করেছে, এবং future-এ নতুন exam state বা behavior add করার জন্য project-কে more maintainable করেছে।
