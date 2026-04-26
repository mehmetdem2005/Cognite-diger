from __future__ import annotations

from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(str(value).replace(",", "."))
    except Exception:
        return default


def risk_label(score: float) -> str:
    if score >= 90:
        return "çok güçlü fırsat"
    if score >= 75:
        return "incelenebilir fırsat"
    if score >= 60:
        return "normal"
    if score >= 40:
        return "riskli"
    return "uzak dur"


def score_listing(listing: dict[str, Any]) -> tuple[float, str]:
    """Basit ilk sürüm kelepir puanlama motoru.

    Bu motor kesin yatırım tavsiyesi vermez. Sadece eksik bilgi, fiyat,
    metrekare, yıl ve kategori sinyallerine göre öncelik puanı üretir.
    """
    price = _num(listing.get("price"))
    props = listing.get("properties") or {}
    category = listing.get("category", "")
    score = 60.0

    if price <= 0:
        return 20.0, "eksik fiyat"

    if category in {"konut", "arsa", "isyeri"}:
        area = _num(props.get("m2") or props.get("metrekare"))
        if area > 0:
            m2_price = price / area
            if m2_price < 10000:
                score += 20
            elif m2_price < 20000:
                score += 10
            elif m2_price > 60000:
                score -= 15
        else:
            score -= 8

        building_age = _num(props.get("bina_yasi"), default=-1)
        if 0 <= building_age <= 5:
            score += 8
        elif building_age > 25:
            score -= 8

        if props.get("krediye_uygun") is True:
            score += 5

    if category == "arac":
        km = _num(props.get("km"))
        year = _num(props.get("yil"))
        damage = _num(props.get("hasar_kaydi"))
        if km and km < 80000:
            score += 12
        elif km > 220000:
            score -= 12
        if year and year >= 2020:
            score += 8
        elif year and year < 2012:
            score -= 8
        if damage > 0:
            score -= min(20, damage / 10000)

    if not listing.get("listing_url"):
        score -= 5
    if not listing.get("image_url"):
        score -= 3

    score = max(0.0, min(100.0, round(score, 2)))
    return score, risk_label(score)
