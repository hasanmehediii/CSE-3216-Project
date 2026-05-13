from pymongo import MongoClient

from mongo_config import get_mongo_uri


class EagerMongoConnection:
    _instance = None

    def __new__(cls):
        return cls._instance

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()


EagerMongoConnection._instance = object.__new__(EagerMongoConnection)
EagerMongoConnection._instance.client = MongoClient(get_mongo_uri())
