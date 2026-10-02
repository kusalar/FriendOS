"""
FRIEND.OS Desktop Backend Server Entry Point
Runs FastAPI with Uvicorn on a configurable or auto-detected localhost port.
Designed for standalone PyInstaller packaging.
"""

import os
import sys
import socket
import logging
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import uvicorn
from backend.config import LOG_DIR, LOG_FILE
from backend.main import app


def setup_desktop_logging():
    """Configure technical logging to %LOCALAPPDATA%\\FRIEND.OS\\logs without logging private memories."""
    log_path = Path(LOG_FILE)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(
        filename=str(log_path),
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def find_available_port(preferred_port=8000, max_attempts=50):
    """
    Checks if preferred_port is available on 127.0.0.1.
    If occupied, sequentially scans for the next available port.
    """
    for port in range(preferred_port, preferred_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"Could not find an available port in range {preferred_port}-{preferred_port + max_attempts}")


def main():
    setup_desktop_logging()
    logging.info("Starting FRIEND.OS Desktop Backend Server...")

    # Determine port from args or auto-detect
    preferred_port = 8000
    for arg in sys.argv[1:]:
        if arg.startswith("--port="):
            try:
                preferred_port = int(arg.split("=")[1])
            except ValueError:
                pass
        elif arg == "--port" and sys.argv.index(arg) + 1 < len(sys.argv):
            try:
                preferred_port = int(sys.argv[sys.argv.index(arg) + 1])
            except ValueError:
                pass

    port = find_available_port(preferred_port)
    logging.info(f"Binding FRIEND.OS Backend to 127.0.0.1:{port}")

    # Print handshake signal for Electron wrapper
    print(f"FRIEND_OS_PORT={port}", flush=True)
    print("FRIEND_OS_READY", flush=True)

    # Run Uvicorn directly with the app instance
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=False,  # Avoid logging private memory query URLs
    )


if __name__ == "__main__":
    main()
