from __future__ import annotations

import pytest


def test_sqlite_is_default_database_engine(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_ENGINE", raising=False)
    from backend.db.adapters import get_database_adapter, get_database_engine

    assert get_database_engine() == "sqlite"
    assert get_database_adapter().engine == "sqlite"


def test_postgres_engine_is_detected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_ENGINE", "postgresql")
    from backend.db.adapters import get_database_adapter, get_database_engine

    assert get_database_engine() == "postgres"
    assert get_database_adapter().engine == "postgres"


def test_postgres_engine_fails_fast_until_adapter_is_ready(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_ENGINE", "postgres")
    from backend.db.connection import get_conn

    with pytest.raises(RuntimeError, match="PostgreSQL migration phase"):
        get_conn()


def test_unknown_database_engine_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_ENGINE", "mysql")
    from backend.db.adapters import get_database_engine

    with pytest.raises(RuntimeError, match="Unsupported DATABASE_ENGINE"):
        get_database_engine()
