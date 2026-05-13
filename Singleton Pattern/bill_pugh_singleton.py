import time
import threading
from pymongo import MongoClient

from mongo_config import get_mongo_uri


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
                    obj.client = MongoClient(get_mongo_uri())
                    cls._creation_count += 1
                    cls._SingletonHelper.instance = obj
        return cls._SingletonHelper.instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()
