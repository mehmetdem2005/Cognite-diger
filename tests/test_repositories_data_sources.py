from __future__ import annotations

from backend.database import init_db
from backend.repositories.data_sources import (
    add_data_source,
    add_source_item,
    delete_data_source,
    get_data_source,
    list_data_sources,
    source_item_exists,
    update_data_source_status,
)
from backend.repositories.listings import add_listing


def _source(name: str = "Test Feed") -> dict:
    return {
        "name": name,
        "source_type": "json_feed",
        "url": "https://example.com/feed.json",
        "category": "konut",
        "enabled": True,
        "config": {"token": "demo"},
    }


def test_data_source_crud_and_status() -> None:
    init_db()
    source_id = add_data_source(_source(), user_id="u1")

    source = get_data_source(source_id, user_id="u1")
    assert source is not None
    assert source["name"] == "Test Feed"
    assert source["enabled"] is True
    assert source["config"] == {"token": "demo"}

    update_data_source_status(source_id, "ok")
    updated = get_data_source(source_id, user_id="u1")
    assert updated["last_status"] == "ok"
    assert updated["last_error"] is None

    update_data_source_status(source_id, "error", "network")
    errored = get_data_source(source_id, user_id="u1")
    assert errored["last_status"] == "error"
    assert errored["last_error"] == "network"

    assert delete_data_source(source_id, user_id="u1") is True
    assert get_data_source(source_id, user_id="u1") is None


def test_source_item_duplicate_detection() -> None:
    init_db()
    source_id = add_data_source(_source(), user_id="u1")
    listing_id = add_listing(
        {"source": "test", "category": "konut", "title": "İlan", "price": 1, "currency": "TRY", "properties": {}, "contact": {}},
        score=50,
        risk_level="low",
        score_reasons=[],
        user_id="u1",
    )

    assert source_item_exists(source_id, "external-1") is False
    add_source_item(source_id, "external-1", listing_id)
    assert source_item_exists(source_id, "external-1") is True


def test_data_source_user_isolation() -> None:
    init_db()
    user_a_source = add_data_source(_source("A feed"), user_id="user-a")
    user_b_source = add_data_source(_source("B feed"), user_id="user-b")

    assert get_data_source(user_a_source, user_id="user-a") is not None
    assert get_data_source(user_a_source, user_id="user-b") is None

    assert [source["id"] for source in list_data_sources(user_id="user-a")] == [user_a_source]
    assert [source["id"] for source in list_data_sources(user_id="user-b")] == [user_b_source]

    assert delete_data_source(user_a_source, user_id="user-b") is False
    assert get_data_source(user_a_source, user_id="user-a") is not None
