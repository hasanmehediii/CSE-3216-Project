from enum import Enum
from pymongo import MongoClient

from mongo_config import get_mongo_uri


class EnumMongoConnection(Enum):
    INSTANCE = 1

    def __init__(self, _value):
        self.client = MongoClient(get_mongo_uri())

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()
