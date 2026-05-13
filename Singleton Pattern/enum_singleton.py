from enum import Enum
from pymongo import MongoClient

MONGO_URI = "mongodb+srv://mehedi2022415897_db_user:xCusNM08Pj1sDVNZ@cluster0.lu2i6u0.mongodb.net/?appName=Cluster0"


class EnumMongoConnection(Enum):
    INSTANCE = 1

    def __init__(self, _value):
        self.client = MongoClient(MONGO_URI)

    def get_database(self, db_name="test_db"):
        return self.client[db_name]

    def get_collection(self, coll_name, db_name="test_db"):
        return self.client[db_name][coll_name]

    def close_connection(self):
        self.client.close()