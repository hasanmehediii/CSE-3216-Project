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

MONGO_URI = "mongodb+srv://mehedi2022415897_db_user:xCusNM08Pj1sDVNZ@cluster0.lu2i6u0.mongodb.net/?appName=Cluster0"


class LazyMongoConnection:
    _instance = None
    _creation_count = 0

    def __new__(cls):
        if cls._instance is None:
            time.sleep(0.05)
            instance = super().__new__(cls)
            instance.client = MongoClient(MONGO_URI)
            cls._creation_count += 1
            cls._instance = instance
        return cls._instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()