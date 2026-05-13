"""
Singleton Pattern — Method 2: Lazy Initialization (Basic)
──────────────────────────────────────────────────────────
The instance is created only when first requested.
Simple and efficient in single-threaded code, but NOT thread-safe.
The artificial sleep widens the race window so concurrency problems
become visible during the thread-safety experiment.
"""

import time
from pymongo import MongoClient

from mongo_config import get_mongo_uri


class LazyMongoConnection:
    _instance = None
    _creation_count = 0

    def __new__(cls):
        if cls._instance is None:
            time.sleep(0.05)
            instance = super().__new__(cls)
            instance.client = MongoClient(get_mongo_uri())
            cls._creation_count += 1
            cls._instance = instance
        return cls._instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()
