from __future__ import annotations

from .adapters import get_database_adapter, get_database_engine, get_sqlite_path

DB_PATH = get_sqlite_path()


def get_conn():
    return get_database_adapter().connect()
