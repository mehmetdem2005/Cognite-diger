from backend.sources.feed_adapters import normalize_feed_item, parse_number, stable_external_id


def test_parse_number_handles_turkish_price_style() -> None:
    assert parse_number("1.250.000") == 1250000.0
    assert parse_number("12,5") == 12.5
    assert parse_number(None) == 0.0


def test_stable_external_id_is_repeatable() -> None:
    assert stable_external_id("abc") == stable_external_id("abc")
    assert stable_external_id("abc") != stable_external_id("def")


def test_normalize_feed_item_maps_common_fields() -> None:
    item = normalize_feed_item(
        {
            "external_id": "x-1",
            "baslik": "Uygun arsa",
            "fiyat": "1.250.000",
            "il": "Adana",
            "ilce": "Seyhan",
            "mahalle": "Gürselpaşa",
            "link": "https://example.com/x-1",
            "gorsel": "https://example.com/x.jpg",
            "properties": {"m2": 500},
        },
        category="arsa",
        source_name="test feed",
        source_mode="authorized_json_feed",
    )

    assert item["title"] == "Uygun arsa"
    assert item["price"] == 1250000.0
    assert item["city"] == "Adana"
    assert item["district"] == "Seyhan"
    assert item["category"] == "arsa"
    assert item["source"] == "test feed"
    assert item["listing_url"] == "https://example.com/x-1"
    assert item["properties"]["m2"] == 500
