from backend.database import (
    add_data_source,
    add_listing,
    add_saved_search,
    get_data_source,
    get_listing,
    get_saved_search,
    init_db,
    list_data_sources,
    list_listings,
    list_saved_searches,
)


def test_database_facade_listing_roundtrip() -> None:
    init_db()
    listing_id = add_listing(
        {
            "source": "test",
            "category": "konut",
            "title": "Test konut",
            "price": 1000000,
            "currency": "TRY",
            "city": "Adana",
            "district": "Seyhan",
            "properties": {"m2": 100},
            "contact": {},
        },
        score=80,
        risk_level="incelenebilir fırsat",
        score_reasons=["test"],
    )

    item = get_listing(listing_id)
    assert item is not None
    assert item["properties"]["m2"] == 100
    assert any(row["id"] == listing_id for row in list_listings())


def test_database_facade_saved_search_roundtrip() -> None:
    init_db()
    search_id = add_saved_search(
        {
            "name": "Seyhan arsa",
            "category": "arsa",
            "filters": {"city": "Adana"},
            "sort_mode": "price_asc",
        }
    )

    item = get_saved_search(search_id)
    assert item is not None
    assert item["filters"]["city"] == "Adana"
    assert any(row["id"] == search_id for row in list_saved_searches("arsa"))


def test_database_facade_data_source_roundtrip() -> None:
    init_db()
    source_id = add_data_source(
        {
            "name": "Test feed",
            "source_type": "json_feed",
            "url": "https://example.com/feed.json",
            "category": "konut",
            "enabled": True,
            "config": {"permission": "authorized"},
        }
    )

    source = get_data_source(source_id)
    assert source is not None
    assert source["config"]["permission"] == "authorized"
    assert any(row["id"] == source_id for row in list_data_sources())
