from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Literal, Protocol

from ..config import DATA_DIR

DatabaseEngine = Literal["sqlite", "postgres"]


class DatabaseAdapter(Protocol):
    engine: DatabaseEngine

    def connect(self):
        """Return a DB-API compatible connection."""


class SQLiteAdapter:
    engine: DatabaseEngine = "sqlite"

    def __init__(self, database_path: Path | None = None) -> None:
        self.database_path = database_path or get_sqlite_path()

    def connect(self) -> sqlite3.Connection:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


class PostgresAdapter:
    engine: DatabaseEngine = "postgres"

    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", "")

    def connect(self):
        raise RuntimeError(
            "DATABASE_ENGINE=postgres is reserved for the PostgreSQL migration phase. "
            "PostgresAdapter skeleton exists, but repository SQL is not ported yet."
        )


def get_database_engine() -> DatabaseEngine:
    engine = os.getenv("DATABASE_ENGINE", "sqlite").lower().strip()
    if engine in {"postgresql", "postgres"}:
        return "postgres"
    if engine == "sqlite":
        return "sqlite"
    raise RuntimeError(f"Unsupported DATABASE_ENGINE: {engine}")


def get_sqlite_path() -> Path:
    return Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "app.db")))


def get_database_adapter() -> DatabaseAdapter:
    engine = get_database_engine()
    if engine == "sqlite":
        return SQLiteAdapter()
    if engine == "postgres":
        return PostgresAdapter()
    raise RuntimeError(f"Unsupported DATABASE_ENGINE: {engine}")
