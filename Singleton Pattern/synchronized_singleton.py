import time
import threading
from pymongo import MongoClient

from mongo_config import get_mongo_uri


class SynchronizedMongoConnection:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                time.sleep(0.05)
                cls._instance = super().__new__(cls)
                cls._instance.client = MongoClient(get_mongo_uri())
        return cls._instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()
