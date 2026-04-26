from __future__ import annotations

import json
from typing import Any

from ..auth import LOCAL_USER_ID
from ..db.connection import get_conn
from .decoders import decode_saved_search


def add_saved_search(data: dict[str, Any], user_id: str = LOCAL_USER_ID) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO saved_searches (user_id, name, category, filters_json, sort_mode, notification_enabled) VALUES (?, ?, ?, ?, ?, ?)",
            (
                user_id,
                data.get("name"),
                data.get("category"),
                json.dumps(data.get("filters") or {}, ensure_ascii=False),
                data.get("sort_mode", "newest"),
                1 if data.get("notification_enabled") else 0,
            ),
        )
        return int(cur.lastrowid)


def list_saved_searches(category: str | None = None, user_id: str = LOCAL_USER_ID) -> list[dict[str, Any]]:
    query = "SELECT * FROM saved_searches WHERE user_id = ?"
    params: list[Any] = [user_id]
    if category:
        query += " AND category = ?"
        params.append(category)
    query += " ORDER BY updated_at DESC, created_at DESC"
    with get_conn() as conn:
        return [decode_saved_search(row) for row in conn.execute(query, params).fetchall()]


def get_saved_search(search_id: int, user_id: str = LOCAL_USER_ID) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM saved_searches WHERE id = ? AND user_id = ?", (search_id, user_id)).fetchone()
        return decode_saved_search(row) if row else None


def delete_saved_search(search_id: int, user_id: str = LOCAL_USER_ID) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM saved_searches WHERE id = ? AND user_id = ?", (search_id, user_id))
        return cur.rowcount > 0
