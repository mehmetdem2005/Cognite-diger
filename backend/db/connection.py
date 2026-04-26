from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Literal

from ..config import DATA_DIR

DatabaseEngine = Literal["sqlite", "postgres"]


def get_database_engine() -> DatabaseEngine:
    engine = os.getenv("DATABASE_ENGINE", "sqlite").lower().strip()
    if engine in {"postgresql", "postgres"}:
        return "postgres"
    if engine == "sqlite":
        return "sqlite"
    raise RuntimeError(f"Unsupported DATABASE_ENGINE: {engine}")


def get_db_path() -> Path:
    return Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "app.db")))


DB_PATH = get_db_path()


def get_conn() -> sqlite3.Connection:
    engine = get_database_engine()
    if engine != "sqlite":
        raise RuntimeError(
            "DATABASE_ENGINE=postgres is reserved for the PostgreSQL migration phase. "
            "Current repository layer still uses sqlite-compatible connections."
        )
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
