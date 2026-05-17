from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
from dotenv import load_dotenv
import os

load_dotenv()


class Database:
    _instance = None
    _client = None
    _db = None

    def __new__(cls):
        if cls._instance is None:
            mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI")
            db_name = os.getenv("DB_NAME")

            if not mongo_uri:
                raise ValueError("Missing MONGODB_URI in .env")
            if not db_name:
                raise ValueError("Missing DB_NAME in .env")

            cls._instance = super(Database, cls).__new__(cls)
            cls._client = AsyncIOMotorClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
            )
            cls._db = cls._client[db_name]
            print("New DB instance created")
        else:
            print("Returning existing DB instance")
        return cls._instance

    def get_db(self):
        return self._db


def get_database():
    return Database().get_db()
