from __future__ import annotations

import json
import sqlite3
from typing import Any


def decode_listing(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["properties"] = json.loads(item.pop("properties_json") or "{}")
    item["contact"] = json.loads(item.pop("contact_json") or "{}")
    item["score_reasons"] = json.loads(item.pop("score_reasons_json") or "[]")
    item["is_favorite"] = bool(item.get("is_favorite"))
    return item


def decode_saved_search(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["filters"] = json.loads(item.pop("filters_json") or "{}")
    item["notification_enabled"] = bool(item.get("notification_enabled"))
    return item


def decode_source(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["enabled"] = bool(item.get("enabled"))
    item["config"] = json.loads(item.pop("config_json") or "{}")
    return item
