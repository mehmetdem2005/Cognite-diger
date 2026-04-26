from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "app.db"


def get_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                price REAL NOT NULL,
                currency TEXT NOT NULL,
                city TEXT,
                district TEXT,
                neighborhood TEXT,
                listing_url TEXT,
                image_url TEXT,
                properties_json TEXT NOT NULL,
                contact_json TEXT NOT NULL,
                notes TEXT,
                score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                score_reasons_json TEXT NOT NULL DEFAULT '[]',
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        _ensure_column(conn, "listings", "score_reasons_json", "score_reasons_json TEXT NOT NULL DEFAULT '[]'")
        _ensure_column(conn, "listings", "is_favorite", "is_favorite INTEGER NOT NULL DEFAULT 0")
        _ensure_column(conn, "listings", "updated_at", "updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                filters_json TEXT NOT NULL,
                sort_mode TEXT NOT NULL DEFAULT 'newest',
                notification_enabled INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scan_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                title TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def _decode_listing(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["properties"] = json.loads(item.pop("properties_json") or "{}")
    item["contact"] = json.loads(item.pop("contact_json") or "{}")
    item["score_reasons"] = json.loads(item.pop("score_reasons_json") or "[]")
    item["is_favorite"] = bool(item.get("is_favorite"))
    return item


def _decode_saved_search(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["filters"] = json.loads(item.pop("filters_json") or "{}")
    item["notification_enabled"] = bool(item.get("notification_enabled"))
    return item


def add_listing(data: dict[str, Any], score: float, risk_level: str, score_reasons: list[str]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO listings (
                source, category, title, price, currency, city, district, neighborhood,
                listing_url, image_url, properties_json, contact_json, notes, score, risk_level,
                score_reasons_json, is_favorite
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.get("source", "manual"),
                data.get("category"),
                data.get("title"),
                data.get("price"),
                data.get("currency", "TRY"),
                data.get("city", ""),
                data.get("district", ""),
                data.get("neighborhood", ""),
                data.get("listing_url"),
                data.get("image_url"),
                json.dumps(data.get("properties") or {}, ensure_ascii=False),
                json.dumps(data.get("contact") or {}, ensure_ascii=False),
                data.get("notes", ""),
                score,
                risk_level,
                json.dumps(score_reasons, ensure_ascii=False),
                1 if data.get("is_favorite") else 0,
            ),
        )
        return int(cur.lastrowid)


def list_listings(
    category: str | None = None,
    sort: str = "newest",
    query_text: str | None = None,
    city: str | None = None,
    district: str | None = None,
    favorites_only: bool = False,
    min_price: float | None = None,
    max_price: float | None = None,
) -> list[dict[str, Any]]:
    order_map = {
        "newest": "created_at DESC",
        "price_asc": "price ASC",
        "price_desc": "price DESC",
        "score_desc": "score DESC",
    }
    order_by = order_map.get(sort, "created_at DESC")
    where: list[str] = []
    params: list[Any] = []

    if category:
        where.append("category = ?")
        params.append(category)
    if query_text:
        where.append("(title LIKE ? OR notes LIKE ? OR city LIKE ? OR district LIKE ? OR neighborhood LIKE ?)")
        like = f"%{query_text}%"
        params.extend([like, like, like, like, like])
    if city:
        where.append("city LIKE ?")
        params.append(f"%{city}%")
    if district:
        where.append("district LIKE ?")
        params.append(f"%{district}%")
    if favorites_only:
        where.append("is_favorite = 1")
    if min_price is not None:
        where.append("price >= ?")
        params.append(min_price)
    if max_price is not None:
        where.append("price <= ?")
        params.append(max_price)

    query = "SELECT * FROM listings"
    if where:
        query += " WHERE " + " AND ".join(where)
    query += f" ORDER BY {order_by}"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
        items = [_decode_listing(row) for row in rows]

    if sort == "m2_price_asc":
        def m2_price(item: dict[str, Any]) -> float:
            m2 = float(item.get("properties", {}).get("m2") or item.get("properties", {}).get("metrekare") or 0)
            return item["price"] / m2 if m2 > 0 else float("inf")
        items.sort(key=m2_price)

    return items


def get_listing(listing_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
        return _decode_listing(row) if row else None


def set_favorite(listing_id: int, is_favorite: bool) -> dict[str, Any] | None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE listings SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (1 if is_favorite else 0, listing_id),
        )
        row = conn.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
        return _decode_listing(row) if row else None


def delete_listing(listing_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
        return cur.rowcount > 0


def add_saved_search(data: dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO saved_searches (name, category, filters_json, sort_mode, notification_enabled)
            VALUES (?, ?, ?, ?, ?)
            """,
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
        rows = conn.execute(query, params).fetchall()
        return [_decode_saved_search(row) for row in rows]


def get_saved_search(search_id: int) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM saved_searches WHERE id = ?", (search_id,)).fetchone()
        return _decode_saved_search(row) if row else None


def delete_saved_search(search_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM saved_searches WHERE id = ?", (search_id,))
        return cur.rowcount > 0
