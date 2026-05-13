import os
from pathlib import Path


ENV_PATH = Path(__file__).with_name(".env")


def _load_env_file():
    if not ENV_PATH.exists():
        return

    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_mongo_uri():
    _load_env_file()
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError(
            "MONGO_URI is missing. Add it to Singleton Pattern/.env or set it as an environment variable."
        )
    return mongo_uri
