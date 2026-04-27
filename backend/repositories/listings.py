from __future__ import annotations

import json
from typing import Any

from ..auth import LOCAL_USER_ID
from ..db.session import db_session, execute, execute_returning_id, fetch_all, fetch_one
from .decoders import decode_listing


def add_listing(data: dict[str, Any], score: float, risk_level: str, score_reasons: list[str], user_id: str = LOCAL_USER_ID) -> int:
    return execute_returning_id(
        """
        INSERT INTO listings (
            user_id, source, category, title, price, currency, city, district, neighborhood,
            listing_url, image_url, properties_json, contact_json, notes, score, risk_level,
            score_reasons_json, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
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


def list_listings(
    category: str | None = None,
    sort: str = "newest",
    query_text: str | None = None,
    city: str | None = None,
    district: str | None = None,
    favorites_only: bool = False,
    min_price: float | None = None,
    max_price: float | None = None,
    user_id: str = LOCAL_USER_ID,
) -> list[dict[str, Any]]:
    order_map = {"newest": "created_at DESC", "price_asc": "price ASC", "price_desc": "price DESC", "score_desc": "score DESC"}
    order_by = order_map.get(sort, "created_at DESC")
    where: list[str] = ["user_id = ?"]
    params: list[Any] = [user_id]

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

    query = "SELECT * FROM listings WHERE " + " AND ".join(where)
    query += f" ORDER BY {order_by}"

    items = [decode_listing(row) for row in fetch_all(query, params)]

    if sort == "m2_price_asc":
        def m2_price(item: dict[str, Any]) -> float:
            m2 = float(item.get("properties", {}).get("m2") or item.get("properties", {}).get("metrekare") or 0)
            return item["price"] / m2 if m2 > 0 else float("inf")

        items.sort(key=m2_price)

    return items


def get_listing(listing_id: int, user_id: str = LOCAL_USER_ID) -> dict[str, Any] | None:
    row = fetch_one("SELECT * FROM listings WHERE id = ? AND user_id = ?", (listing_id, user_id))
    return decode_listing(row) if row else None


def set_favorite(listing_id: int, is_favorite: bool, user_id: str = LOCAL_USER_ID) -> dict[str, Any] | None:
    with db_session() as conn:
        conn.execute(
            "UPDATE listings SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
            (1 if is_favorite else 0, listing_id, user_id),
        )
        row = conn.execute("SELECT * FROM listings WHERE id = ? AND user_id = ?", (listing_id, user_id)).fetchone()
        return decode_listing(row) if row else None


def delete_listing(listing_id: int, user_id: str = LOCAL_USER_ID) -> bool:
    affected = execute("DELETE FROM listings WHERE id = ? AND user_id = ?", (listing_id, user_id))
    return affected > 0
