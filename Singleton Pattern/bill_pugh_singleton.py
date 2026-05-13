import time
import threading
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://mehedi2022415897_db_user:xCusNM08Pj1sDVNZ@cluster0.lu2i6u0.mongodb.net/?appName=Cluster0"


class BillPughMongoConnection:
    _lock = threading.Lock()
    _creation_count = 0

    class _SingletonHelper:
        instance = None

    def __new__(cls):
        if cls._SingletonHelper.instance is None:
            with cls._lock:
                if cls._SingletonHelper.instance is None:
                    time.sleep(0.05)
                    obj = super().__new__(cls)
                    obj.client = MongoClient(MONGO_URI)
                    cls._creation_count += 1
                    cls._SingletonHelper.instance = obj
        return cls._SingletonHelper.instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()