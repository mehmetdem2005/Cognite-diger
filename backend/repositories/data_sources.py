from __future__ import annotations

import json
from typing import Any

from ..db.connection import get_conn
from .decoders import decode_source


def add_data_source(data: dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO data_sources (name, source_type, url, category, enabled, config_json) VALUES (?, ?, ?, ?, ?, ?)",
            (
                data.get("name"),
                data.get("source_type"),
                data.get("url"),
                data.get("category"),
                1 if data.get("enabled", True) else 0,
                json.dumps(data.get("config") or {}, ensure_ascii=False),
            ),
        )
        return int(cur.lastrowid)


def list_data_sources() -> list[dict[str, Any]]:
    with get_conn() as conn:
        return [decode_source(row) for row in conn.execute("SELECT * FROM data_sources ORDER BY created_at DESC").fetchall()]


def get_data_source(source_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM data_sources WHERE id = ?", (source_id,)).fetchone()
        return decode_source(row) if row else None


def delete_data_source(source_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM data_sources WHERE id = ?", (source_id,))
        return cur.rowcount > 0


def update_data_source_status(source_id: int, status: str, error: str | None = None) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE data_sources SET last_status = ?, last_error = ?, last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, error, source_id),
        )


def source_item_exists(source_id: int, external_id: str) -> bool:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM source_items WHERE source_id = ? AND external_id = ?", (source_id, external_id)).fetchone()
        return bool(row)


def add_source_item(source_id: int, external_id: str, listing_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO source_items (source_id, external_id, listing_id, last_seen_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            (source_id, external_id, listing_id),
        )
