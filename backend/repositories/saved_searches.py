from __future__ import annotations

import json
from typing import Any

from ..db.connection import get_conn
from .decoders import decode_saved_search


def add_saved_search(data: dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO saved_searches (name, category, filters_json, sort_mode, notification_enabled) VALUES (?, ?, ?, ?, ?)",
            (
                data.get("name"),
                data.get("category"),
                json.dumps(data.get("filters") or {}, ensure_ascii=False),
                data.get("sort_mode", "newest"),
                1 if data.get("notification_enabled") else 0,
            ),
        )
        return int(cur.lastrowid)


def list_saved_searches(category: str | None = None) -> list[dict[str, Any]]:
    query = "SELECT * FROM saved_searches"
    params: list[Any] = []
    if category:
        query += " WHERE category = ?"
        params.append(category)
    query += " ORDER BY updated_at DESC, created_at DESC"
    with get_conn() as conn:
        return [decode_saved_search(row) for row in conn.execute(query, params).fetchall()]


def get_saved_search(search_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM saved_searches WHERE id = ?", (search_id,)).fetchone()
        return decode_saved_search(row) if row else None


def delete_saved_search(search_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM saved_searches WHERE id = ?", (search_id,))
        return cur.rowcount > 0
