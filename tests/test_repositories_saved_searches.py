from __future__ import annotations

from backend.database import init_db
from backend.repositories.saved_searches import add_saved_search, delete_saved_search, get_saved_search, list_saved_searches


def _saved_search(name: str, category: str = "konut") -> dict:
    return {
        "name": name,
        "category": category,
        "filters": {"city": "Adana", "max_price": 1000000},
        "sort_mode": "price_asc",
        "notification_enabled": True,
    }


def test_saved_search_crud_and_category_filter() -> None:
    init_db()
    konut_id = add_saved_search(_saved_search("Konut aramam", "konut"), user_id="u1")
    arsa_id = add_saved_search(_saved_search("Arsa aramam", "arsa"), user_id="u1")

    item = get_saved_search(konut_id, user_id="u1")
    assert item is not None
    assert item["name"] == "Konut aramam"
    assert item["filters"] == {"city": "Adana", "max_price": 1000000}
    assert item["notification_enabled"] is True

    konut_items = list_saved_searches(category="konut", user_id="u1")
    assert [item["id"] for item in konut_items] == [konut_id]

    all_items = list_saved_searches(user_id="u1")
    assert {item["id"] for item in all_items} == {konut_id, arsa_id}

    assert delete_saved_search(konut_id, user_id="u1") is True
    assert get_saved_search(konut_id, user_id="u1") is None


def test_saved_search_user_isolation() -> None:
    init_db()
    user_a_id = add_saved_search(_saved_search("A arama"), user_id="user-a")
    user_b_id = add_saved_search(_saved_search("B arama"), user_id="user-b")

    assert get_saved_search(user_a_id, user_id="user-a") is not None
    assert get_saved_search(user_a_id, user_id="user-b") is None

    assert [item["id"] for item in list_saved_searches(user_id="user-a")] == [user_a_id]
    assert [item["id"] for item in list_saved_searches(user_id="user-b")] == [user_b_id]

    assert delete_saved_search(user_a_id, user_id="user-b") is False
    assert get_saved_search(user_a_id, user_id="user-a") is not None
