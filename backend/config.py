import os
import sys
from pathlib import Path

# Allow overriding data directory via environment variable or standard Windows %LOCALAPPDATA%
local_appdata = os.getenv("LOCALAPPDATA")

if os.getenv("FRIEND_OS_DATA_DIR"):
    DATA_DIR = Path(os.getenv("FRIEND_OS_DATA_DIR"))
elif local_appdata and getattr(sys, "frozen", False):
    # When packaged as a desktop app, store in %LOCALAPPDATA%\FRIEND.OS\data
    DATA_DIR = Path(local_appdata) / "FRIEND.OS" / "data"
else:
    # Development default: project root data folder
    BASE_DIR = Path(__file__).resolve().parent.parent
    DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_PATH = str(DATA_DIR / "friend_os.db")

# Log directory for troubleshooting without logging memory content
if local_appdata:
    LOG_DIR = Path(local_appdata) / "FRIEND.OS" / "logs"
else:
    LOG_DIR = DATA_DIR.parent / "logs"

LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = str(LOG_DIR / "app.log")

# Local LLM configuration
OLLAMA_MODEL = os.getenv("FRIEND_OS_MODEL", "qwen3:4b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

