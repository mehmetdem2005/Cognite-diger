from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator, Sequence

from .connection import get_conn

Params = Sequence[Any] | tuple[Any, ...]


@contextmanager
def db_session() -> Iterator[Any]:
    """Open a DB connection with commit/rollback semantics.

    Existing repositories can still use get_conn() directly, but new repository code
    should prefer this helper so transaction behavior stays consistent across future
    database adapters.
    """
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_one(query: str, params: Params = ()) -> Any | None:
    with db_session() as conn:
        return conn.execute(query, tuple(params)).fetchone()


def fetch_all(query: str, params: Params = ()) -> list[Any]:
    with db_session() as conn:
        return list(conn.execute(query, tuple(params)).fetchall())


def execute(query: str, params: Params = ()) -> int:
    with db_session() as conn:
        cur = conn.execute(query, tuple(params))
        return int(cur.rowcount)


def execute_returning_id(query: str, params: Params = ()) -> int:
    with db_session() as conn:
        cur = conn.execute(query, tuple(params))
        return int(cur.lastrowid)


def execute_many(query: str, param_sets: Sequence[Params]) -> int:
    with db_session() as conn:
        cur = conn.executemany(query, [tuple(params) for params in param_sets])
        return int(cur.rowcount)
