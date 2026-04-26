from __future__ import annotations

from typing import Any


def _num(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(str(value).replace(",", "."))
    except Exception:
        return default


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "evet", "yes", "var"}
    return bool(value)


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


def _add(reasons: list[str], score_ref: list[float], points: float, text: str) -> None:
    score_ref[0] += points
    sign = "+" if points > 0 else ""
    reasons.append(f"{sign}{points:g}: {text}")


def score_listing(listing: dict[str, Any]) -> tuple[float, str, list[str]]:
    """Açıklanabilir ilk sürüm kelepir puanlama motoru.

    Bu motor kesin yatırım/satın alma tavsiyesi vermez. Eksik bilgi, fiyat,
    metrekare, yıl ve kategori sinyallerine göre öncelik puanı üretir.
    """
    price = _num(listing.get("price"))
    props = listing.get("properties") or {}
    category = listing.get("category", "")
    score_ref = [60.0]
    reasons: list[str] = ["60: temel başlangıç puanı"]

    if price <= 0:
        return 20.0, "eksik fiyat", ["-40: fiyat yok veya geçersiz"]

    if category in {"konut", "arsa", "isyeri"}:
        area = _num(props.get("m2") or props.get("metrekare"))
        if area > 0:
            m2_price = price / area
            if m2_price < 10000:
                _add(reasons, score_ref, 20, "metrekare fiyatı çok düşük görünüyor")
            elif m2_price < 20000:
                _add(reasons, score_ref, 10, "metrekare fiyatı avantajlı görünüyor")
            elif m2_price > 60000:
                _add(reasons, score_ref, -15, "metrekare fiyatı yüksek görünüyor")
            else:
                reasons.append("0: metrekare fiyatı normal aralıkta")
        else:
            _add(reasons, score_ref, -8, "metrekare bilgisi eksik")

        building_age = _num(props.get("bina_yasi"), default=-1)
        if 0 <= building_age <= 5:
            _add(reasons, score_ref, 8, "bina yaşı yeni")
        elif building_age > 25:
            _add(reasons, score_ref, -8, "bina yaşı yüksek")

        if category == "arsa":
            imar = str(props.get("imar") or "").lower()
            tapu = str(props.get("tapu") or "").lower()
            if "konut" in imar or "imarlı" in imar:
                _add(reasons, score_ref, 8, "imar bilgisi olumlu")
            elif not imar:
                _add(reasons, score_ref, -6, "imar bilgisi eksik")
            if "hisseli" in tapu:
                _add(reasons, score_ref, -12, "hisseli tapu riski")
            elif "müstakil" in tapu or "mustakil" in tapu:
                _add(reasons, score_ref, 6, "müstakil tapu avantajı")
            if _bool(props.get("yol_cephe")):
                _add(reasons, score_ref, 5, "yola cephe bilgisi olumlu")

        if category == "isyeri":
            if _bool(props.get("cadde_uzeri")):
                _add(reasons, score_ref, 7, "cadde üzeri avantajı")
            if str(props.get("kat") or "").lower() in {"giriş", "giris", "zemin"}:
                _add(reasons, score_ref, 5, "giriş/zemin kat avantajı")

        if _bool(props.get("krediye_uygun")):
            _add(reasons, score_ref, 5, "krediye uygunluk avantajı")

    if category == "arac":
        km = _num(props.get("km"))
        year = _num(props.get("yil"))
        damage = _num(props.get("hasar_kaydi"))
        if km and km < 80000:
            _add(reasons, score_ref, 12, "kilometre düşük")
        elif km > 220000:
            _add(reasons, score_ref, -12, "kilometre yüksek")
        elif not km:
            _add(reasons, score_ref, -7, "kilometre bilgisi eksik")

        if year and year >= 2020:
            _add(reasons, score_ref, 8, "model yılı yeni")
        elif year and year < 2012:
            _add(reasons, score_ref, -8, "model yılı eski")
        elif not year:
            _add(reasons, score_ref, -6, "model yılı eksik")

        if damage > 0:
            penalty = min(20, damage / 10000)
            _add(reasons, score_ref, -penalty, "hasar kaydı puanı düşürüyor")
        elif damage == 0 and props.get("hasar_kaydi") not in {None, ""}:
            _add(reasons, score_ref, 5, "hasar kaydı yok bilgisi olumlu")

    if not listing.get("city"):
        _add(reasons, score_ref, -4, "şehir bilgisi eksik")
    if not listing.get("district"):
        _add(reasons, score_ref, -3, "ilçe bilgisi eksik")
    if not listing.get("listing_url"):
        _add(reasons, score_ref, -5, "ilan linki eksik")
    if not listing.get("image_url"):
        _add(reasons, score_ref, -3, "görsel yok")

    score = max(0.0, min(100.0, round(score_ref[0], 2)))
    return score, risk_label(score), reasons
