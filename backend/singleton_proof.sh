python -c "
from database import Database;
db1 = Database();
db2 = Database();
print('Same instance?', db1 is db2);
print('db1 id:', id(db1));
print('db2 id:', id(db2))
"