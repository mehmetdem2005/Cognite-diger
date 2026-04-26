from __future__ import annotations

import sqlite3

from ..config import DATA_DIR

DB_PATH = DATA_DIR / "app.db"


def get_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
