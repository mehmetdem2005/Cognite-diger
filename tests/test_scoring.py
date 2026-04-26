from backend.scoring import score_listing


def test_score_listing_rewards_good_land_signal() -> None:
    listing = {
        "category": "arsa",
        "title": "İmarlı arsa",
        "price": 1_000_000,
        "city": "Adana",
        "district": "Seyhan",
        "listing_url": "https://example.com/1",
        "image_url": "https://example.com/1.jpg",
        "properties": {"m2": 500, "imar": "konut imarlı", "tapu": "müstakil", "yol_cephe": True},
    }

    score, risk, reasons = score_listing(listing)

    assert score >= 85
    assert risk in {"incelenebilir fırsat", "çok güçlü fırsat"}
    assert any("imar" in reason for reason in reasons)


def test_score_listing_penalizes_missing_price() -> None:
    score, risk, reasons = score_listing({"category": "konut", "price": 0, "properties": {}})

    assert score == 20.0
    assert risk == "eksik fiyat"
    assert reasons


def test_score_listing_penalizes_high_km_vehicle() -> None:
    listing = {
        "category": "arac",
        "title": "Eski araç",
        "price": 500_000,
        "city": "Adana",
        "district": "Seyhan",
        "listing_url": "https://example.com/car",
        "image_url": "https://example.com/car.jpg",
        "properties": {"km": 250000, "yil": 2010, "hasar_kaydi": 50000},
    }

    score, _risk, reasons = score_listing(listing)

    assert score < 60
    assert any("kilometre yüksek" in reason for reason in reasons)
    assert any("hasar" in reason for reason in reasons)
