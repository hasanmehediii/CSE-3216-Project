import time
import threading
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://mehedi2022415897_db_user:xCusNM08Pj1sDVNZ@cluster0.lu2i6u0.mongodb.net/?appName=Cluster0"


class DoubleCheckedMongoConnection:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    time.sleep(0.05)
                    cls._instance = super().__new__(cls)
                    cls._instance.client = MongoClient(MONGO_URI)
        return cls._instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()