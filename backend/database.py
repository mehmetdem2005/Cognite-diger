from __future__ import annotations

from .db.connection import DB_PATH, get_conn
from .db.migrations import init_db as _init_db
from .repositories.data_sources import (
    add_data_source,
    add_source_item,
    delete_data_source,
    get_data_source,
    list_data_sources,
    source_item_exists,
    update_data_source_status,
)
from .repositories.listings import add_listing, delete_listing, get_listing, list_listings, set_favorite
from .repositories.saved_searches import add_saved_search, delete_saved_search, get_saved_search, list_saved_searches


def init_db() -> None:
    with get_conn() as conn:
        _init_db(conn)


__all__ = [
    "DB_PATH",
    "get_conn",
    "init_db",
    "add_listing",
    "list_listings",
    "get_listing",
    "set_favorite",
    "delete_listing",
    "add_saved_search",
    "list_saved_searches",
    "get_saved_search",
    "delete_saved_search",
    "add_data_source",
    "list_data_sources",
    "get_data_source",
    "delete_data_source",
    "update_data_source_status",
    "source_item_exists",
    "add_source_item",
]
