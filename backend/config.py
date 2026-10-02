import os
from pathlib import Path

# FRIEND.OS Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists for local SQLite storage
DATA_DIR.mkdir(parents=True, exist_ok=True)

# SQLite Database Location: C:\friend-os\data\friend_os.db
DATABASE_PATH = str(DATA_DIR / "friend_os.db")

# Local LLM configuration
OLLAMA_MODEL = os.getenv("FRIEND_OS_MODEL", "qwen3:4b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
