# Day 2 - Factory Pattern / Abstract Factory Pattern

## Project Update

In the second assignment, the previous `items` example was removed because the project is no longer an e-commerce demo. The backend now represents a campus user system with three user types:

- Student
- Teacher
- Staff

The project still keeps the lazy singleton database connection from Day 1. On top of that, Day 2 adds a factory-pattern-based user creation flow, authentication, role-based visibility, and a React frontend for selecting user roles.

## What Was Implemented

### 1. Removed Item Demo

The old item model and item route were removed:

- `backend/models/item.py`
- `backend/routes/items.py`

The API now focuses on user registration, login, and role-based user visibility.

### 2. Factory Pattern for Campus Users

The main factory-pattern implementation is in:

```text
backend/models/user.py
```

The design contains:

- `CampusUser`: abstract base class
- `StudentUser`: concrete user class
- `TeacherUser`: concrete user class
- `StaffUser`: concrete user class
- `CampusUserFactory`: factory class that creates the correct user object based on role

When a new user registers, the service does not directly create a student, teacher, or staff object manually. Instead, it calls:

```python
CampusUserFactory.create(...)
```

The factory checks the selected role and returns the correct concrete user object.

### 3. Authentication System

Authentication was added for all user types.

Implemented features:

- User registration
- User login
- Password hashing with PBKDF2
- JWT access token creation
- JWT validation
- Cookie-based token storage
- Bearer token support
- Current user detection through `/auth/me`
- Logout through `/auth/logout`

Important files:

```text
backend/routes/auth.py
backend/controllers/auth_controller.py
backend/services/auth_service.py
```

### 4. Role-Based User Visibility

Each role can see the other two user types:

- Student can see teachers and staff
- Teacher can see students and staff
- Staff can see students and teachers

This logic is implemented in:

```text
backend/services/user_service.py
backend/controllers/user_controller.py
backend/routes/users.py
```

The main API endpoint is:

```text
GET /users/visible
```

This endpoint requires authentication.

### 5. Middleware and CORS

The backend now includes:

- CORS middleware for the frontend
- Rate limiting middleware

Important files:

```text
backend/main.py
backend/middlewares/rate_limit.py
```

### 6. Frontend Role UI

The frontend was changed from the old landing page into a campus role dashboard.

Implemented frontend features:

- Student, Teacher, and Staff role buttons
- Register form
- Login form
- Current user display
- Logout button
- Two-column visible user list

Important files:

```text
frontend/src/pages/Home.jsx
frontend/src/pages/Home.css
frontend/src/components/Navbar.jsx
frontend/src/components/Footer.jsx
```

## API Endpoints

### Health / Database

```text
GET /
GET /db-status
```

### Auth

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Users

```text
GET /users/visible
```

## Example Register Request

```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mehedi Hasan",
    "email": "mehedi@example.com",
    "password": "your-password",
    "role": "student",
    "department": "CSE"
  }'
```

## Example Login Request

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mehedi@example.com",
    "password": "your-password"
  }'
```

## Example Visible Users Request

```bash
curl http://127.0.0.1:8000/users/visible \
  -H "Authorization: Bearer <paste-token-here>"
```

## How the Factory Pattern Helps

Without the factory pattern, the registration service would need conditional object creation logic everywhere a user is created. That would make the code harder to extend.

With the factory pattern:

- User creation is centralized
- Role-specific classes are separated
- Adding another user type later becomes easier
- The service layer depends on the factory instead of directly depending on every concrete class

For example, if an `AdminUser` is added later, only the model/factory mapping and visibility rules need to be extended.

## UML Diagram

The Mermaid UML diagram is available in:

```text
backend/test/day2-uml.mmd
```

It shows:

- Singleton database class
- Abstract campus user model
- Concrete user classes
- Factory class
- Auth service/controller/routes
- User visibility service/controller/routes
- Middleware
- Frontend relationship with backend APIs
