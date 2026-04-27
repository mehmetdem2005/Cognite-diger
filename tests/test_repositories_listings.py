from __future__ import annotations

from backend.database import init_db
from backend.repositories.listings import add_listing, delete_listing, get_listing, list_listings, set_favorite


def _listing(title: str, category: str = "konut", price: float = 1000, m2: int = 100) -> dict:
    return {
        "source": "test",
        "category": category,
        "title": title,
        "price": price,
        "currency": "TRY",
        "city": "Adana",
        "district": "Seyhan",
        "neighborhood": "Test Mahallesi",
        "listing_url": f"https://example.com/{title}",
        "image_url": None,
        "properties": {"m2": m2, "oda": "3+1"},
        "contact": {"name": "Test"},
        "notes": "test notu",
    }


def test_listing_crud_and_favorite_flow() -> None:
    init_db()
    listing_id = add_listing(_listing("Temiz daire"), score=82, risk_level="low", score_reasons=["iyi fiyat"], user_id="u1")

    item = get_listing(listing_id, user_id="u1")
    assert item is not None
    assert item["title"] == "Temiz daire"
    assert item["properties"]["m2"] == 100
    assert item["contact"]["name"] == "Test"
    assert item["score_reasons"] == ["iyi fiyat"]
    assert item["is_favorite"] is False

    favorited = set_favorite(listing_id, True, user_id="u1")
    assert favorited is not None
    assert favorited["is_favorite"] is True

    favorites = list_listings(favorites_only=True, user_id="u1")
    assert len(favorites) == 1
    assert favorites[0]["id"] == listing_id

    assert delete_listing(listing_id, user_id="u1") is True
    assert get_listing(listing_id, user_id="u1") is None


def test_listing_filters_and_sort_modes() -> None:
    init_db()
    cheap_id = add_listing(_listing("Ucuz geniş konut", price=1_000_000, m2=200), score=90, risk_level="low", score_reasons=[], user_id="u1")
    expensive_id = add_listing(_listing("Pahalı küçük konut", price=2_000_000, m2=50), score=60, risk_level="medium", score_reasons=[], user_id="u1")
    arsa_id = add_listing(_listing("Arsa ilanı", category="arsa", price=500_000, m2=500), score=75, risk_level="low", score_reasons=[], user_id="u1")

    konut_items = list_listings(category="konut", user_id="u1")
    assert {item["id"] for item in konut_items} == {cheap_id, expensive_id}

    search_items = list_listings(query_text="geniş", user_id="u1")
    assert [item["id"] for item in search_items] == [cheap_id]

    price_asc = list_listings(sort="price_asc", user_id="u1")
    assert price_asc[0]["id"] == arsa_id

    price_desc = list_listings(sort="price_desc", user_id="u1")
    assert price_desc[0]["id"] == expensive_id

    score_desc = list_listings(sort="score_desc", user_id="u1")
    assert score_desc[0]["id"] == cheap_id

    m2_asc = list_listings(category="konut", sort="m2_price_asc", user_id="u1")
    assert m2_asc[0]["id"] == cheap_id


def test_listing_user_isolation() -> None:
    init_db()
    user_a_id = add_listing(_listing("A kullanıcısı ilanı"), score=80, risk_level="low", score_reasons=[], user_id="user-a")
    user_b_id = add_listing(_listing("B kullanıcısı ilanı"), score=70, risk_level="medium", score_reasons=[], user_id="user-b")

    assert get_listing(user_a_id, user_id="user-a") is not None
    assert get_listing(user_a_id, user_id="user-b") is None

    assert [item["id"] for item in list_listings(user_id="user-a")] == [user_a_id]
    assert [item["id"] for item in list_listings(user_id="user-b")] == [user_b_id]

    assert delete_listing(user_a_id, user_id="user-b") is False
    assert get_listing(user_a_id, user_id="user-a") is not None
