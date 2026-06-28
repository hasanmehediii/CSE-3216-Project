### Run these commands in your terminal to see the Singleton pattern in action:

```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
# In another terminal, log in and request visible users
1. curl -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"mehedi@example.com","password":"your-password"}'
2. curl http://localhost:8000/users/visible -H "Authorization: Bearer <paste-token-here>"
3. curl http://localhost:8000/db-status

### Test Singleton Behavior
```
python -c "
from database import Database

db1 = Database()
db2 = Database()

print('Same instance?', db1 is db2)
print('Same ID?', id(db1) == id(db2))
"
``` 

### You should see the following output in your server logs, confirming that only one database instance is created:

```✅ New DB instance created
♻️  Returning existing DB instance
Same instance? True
Same ID? True
```
