from fastapi.testclient import TestClient

from backend.sources.email_alerts import parse_email_alert_text


def test_parse_email_alert_text_extracts_listing() -> None:
    text = """
    Sahibinden alarmı
    Adana Seyhan 3+1 125 m2 temiz daire
    Fiyat: 1.250.000 TL
    https://www.example.com/ilan/123
    """

    result = parse_email_alert_text(text, default_category="konut", default_city="Adana", default_district="Seyhan")

    assert result.skipped_count == 0
    assert len(result.listings) == 1
    listing = result.listings[0]
    assert listing["price"] == 1250000
    assert listing["currency"] == "TRY"
    assert listing["category"] == "konut"
    assert listing["city"] == "Adana"
    assert listing["district"] == "Seyhan"
    assert listing["properties"]["m2"] == 125
    assert listing["properties"]["oda"] == "3+1"
    assert listing["listing_url"] == "https://www.example.com/ilan/123"


def test_parse_email_alert_skips_without_price() -> None:
    text = "İlan linki var ama fiyat yok https://www.example.com/ilan/999"
    result = parse_email_alert_text(text)
    assert result.listings == []
    assert result.skipped_count == 1


def test_email_alert_import_endpoint() -> None:
    from backend.main import app

    client = TestClient(app)
    response = client.post(
        "/api/import/email-alert",
        json={
            "default_category": "konut",
            "default_city": "Adana",
            "default_district": "Seyhan",
            "text": "Adana Seyhan 2+1 90 m2 daire 950.000 TL https://www.example.com/ilan/abc",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["parsed_count"] == 1
    assert payload["imported_count"] == 1

    listings = client.get("/api/listings?category=konut").json()
    assert any(item["listing_url"] == "https://www.example.com/ilan/abc" for item in listings)
