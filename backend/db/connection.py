from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from ..config import DATA_DIR


def get_db_path() -> Path:
    return Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "app.db")))


DB_PATH = get_db_path()


def get_conn() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
