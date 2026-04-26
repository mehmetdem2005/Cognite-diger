from __future__ import annotations

import os
from pathlib import Path

from backend.database import add_listing, init_db, list_listings


def test_tests_use_temporary_database_path(tmp_path: Path) -> None:
    configured_path = Path(os.environ["DATABASE_PATH"])

    assert configured_path.name == "test-app.db"
    assert str(configured_path).startswith(str(tmp_path.parent))
    assert "data/app.db" not in str(configured_path)


def test_database_starts_empty_for_each_test() -> None:
    init_db()
    assert list_listings() == []


def test_database_can_write_inside_isolated_db() -> None:
    init_db()
    listing_id = add_listing(
        {
            "source": "test",
            "category": "konut",
            "title": "İzole test ilanı",
            "price": 100,
            "currency": "TRY",
            "properties": {},
            "contact": {},
        },
        score=50,
        risk_level="test",
        score_reasons=["test"],
    )

    assert listing_id >= 1
    assert len(list_listings()) == 1
