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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
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


def add_listing(data: dict[str, Any], score: float, risk_level: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO listings (
                source, category, title, price, currency, city, district, neighborhood,
                listing_url, image_url, properties_json, contact_json, notes, score, risk_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ),
        )
        return int(cur.lastrowid)


def list_listings(category: str | None = None, sort: str = "newest") -> list[dict[str, Any]]:
    order_map = {
        "newest": "created_at DESC",
        "price_asc": "price ASC",
        "price_desc": "price DESC",
        "score_desc": "score DESC",
    }
    order_by = order_map.get(sort, "created_at DESC")
    query = "SELECT * FROM listings"
    params: list[Any] = []
    if category:
        query += " WHERE category = ?"
        params.append(category)
    query += f" ORDER BY {order_by}"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()
        items: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            item["properties"] = json.loads(item.pop("properties_json") or "{}")
            item["contact"] = json.loads(item.pop("contact_json") or "{}")
            items.append(item)
        return items
