from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def isolated_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Run each test with its own SQLite database file.

    This prevents tests from touching the developer/production data/app.db file and
    makes repeated CI runs deterministic.
    """
    db_path = tmp_path / "test-app.db"
    monkeypatch.setenv("DATABASE_PATH", str(db_path))
    monkeypatch.setenv("ENABLE_SCHEDULER", "false")

    modules_to_reload = [
        "backend.config",
        "backend.db.connection",
        "backend.database",
        "backend.repositories.auth",
        "backend.repositories.listings",
        "backend.repositories.saved_searches",
        "backend.repositories.data_sources",
        "backend.repositories.jobs",
        "backend.auth",
        "backend.services.source_sync",
        "backend.services.job_runner",
        "backend.main",
    ]
    for module_name in modules_to_reload:
        if module_name in os.sys.modules:
            importlib.reload(os.sys.modules[module_name])

    from backend.database import init_db

    init_db()
    yield
