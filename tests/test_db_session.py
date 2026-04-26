from __future__ import annotations

import pytest

from backend.db.session import db_session, execute, execute_returning_id, fetch_all, fetch_one


def test_db_session_commits_successful_transaction() -> None:
    with db_session() as conn:
        conn.execute("CREATE TABLE sample_commit (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)")
        conn.execute("INSERT INTO sample_commit (name) VALUES (?)", ("alpha",))

    row = fetch_one("SELECT name FROM sample_commit WHERE name = ?", ("alpha",))
    assert row is not None
    assert row["name"] == "alpha"


def test_db_session_rolls_back_failed_transaction() -> None:
    with db_session() as conn:
        conn.execute("CREATE TABLE sample_rollback (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)")

    with pytest.raises(RuntimeError):
        with db_session() as conn:
            conn.execute("INSERT INTO sample_rollback (name) VALUES (?)", ("beta",))
            raise RuntimeError("force rollback")

    rows = fetch_all("SELECT * FROM sample_rollback")
    assert rows == []


def test_execute_and_fetch_helpers() -> None:
    with db_session() as conn:
        conn.execute("CREATE TABLE sample_helpers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)")

    first_id = execute_returning_id("INSERT INTO sample_helpers (name) VALUES (?)", ("one",))
    second_id = execute_returning_id("INSERT INTO sample_helpers (name) VALUES (?)", ("two",))

    assert first_id == 1
    assert second_id == 2

    row = fetch_one("SELECT name FROM sample_helpers WHERE id = ?", (first_id,))
    rows = fetch_all("SELECT name FROM sample_helpers ORDER BY id ASC")

    assert row["name"] == "one"
    assert [item["name"] for item in rows] == ["one", "two"]

    affected = execute("DELETE FROM sample_helpers WHERE id = ?", (first_id,))
    assert affected == 1
    assert len(fetch_all("SELECT * FROM sample_helpers")) == 1
