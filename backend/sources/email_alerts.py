from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

ALLOWED_CATEGORIES = {"konut", "arsa", "isyeri", "arac"}
PRICE_RE = re.compile(r"(?P<price>\d[\d\.\s,]*)\s*(?P<currency>TL|TRY|₺|USD|EUR)?", re.IGNORECASE)
URL_RE = re.compile(r"https?://[^\s<>()\"]+", re.IGNORECASE)
M2_RE = re.compile(r"(?P<m2>\d{2,6})\s*(m2|m²|metrekare)", re.IGNORECASE)
KM_RE = re.compile(r"(?P<km>\d[\d\.\s]{2,})\s*(km|kilometre)", re.IGNORECASE)
YEAR_RE = re.compile(r"\b(19\d{2}|20\d{2})\b")
ROOM_RE = re.compile(r"\b\d\+\d\b")


@dataclass(frozen=True)
class EmailAlertParseResult:
    listings: list[dict[str, Any]]
    skipped_count: int


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _clean_url(value: str) -> str:
    return value.rstrip(".,;)]}\n\r\t ")


def _price_to_float(value: str) -> float:
    normalized = value.replace(".", "").replace(" ", "").replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return 0.0


def _currency(raw: str | None) -> str:
    if not raw:
        return "TRY"
    raw_upper = raw.upper()
    if raw_upper in {"TL", "TRY", "₺"}:
        return "TRY"
    if raw_upper in {"USD", "EUR"}:
        return raw_upper
    return "TRY"


def _infer_category(text: str, default_category: str) -> str:
    if default_category in ALLOWED_CATEGORIES:
        return default_category
    lower = text.lower()
    if any(word in lower for word in ["arsa", "tarla", "parsel", "imar"]):
        return "arsa"
    if any(word in lower for word in ["ofis", "işyeri", "dükkan", "depo", "mağaza"]):
        return "isyeri"
    if any(word in lower for word in ["araç", "otomobil", "araba", "km", "model", "vites"]):
        return "arac"
    return "konut"


def _extract_properties(text: str, category: str) -> dict[str, Any]:
    props: dict[str, Any] = {}
    m2 = M2_RE.search(text)
    if m2:
        props["m2"] = int(m2.group("m2"))
    if category == "konut":
        room = ROOM_RE.search(text)
        if room:
            props["oda"] = room.group(0)
    if category == "arac":
        km = KM_RE.search(text)
        if km:
            props["km"] = int(re.sub(r"\D", "", km.group("km")) or 0)
        year = YEAR_RE.search(text)
        if year:
            props["yil"] = int(year.group(0))
    return props


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return "email_alert"


def _title_from_context(context: str, url: str) -> str:
    lines = [line.strip(" -•\t") for line in context.splitlines() if line.strip(" -•\t")]
    for line in lines:
        if "http" not in line and len(line) >= 8:
            return _clean_text(line)[:180]
    return f"E-posta alarmı ilanı - {_domain(url)}"


def parse_email_alert_text(text: str, default_category: str = "konut", default_city: str = "", default_district: str = "") -> EmailAlertParseResult:
    raw_text = text or ""
    urls = [_clean_url(match.group(0)) for match in URL_RE.finditer(raw_text)]
    seen_urls: set[str] = set()
    listings: list[dict[str, Any]] = []
    skipped = 0

    for url in urls:
        if url in seen_urls:
            skipped += 1
            continue
        seen_urls.add(url)

        index = raw_text.find(url)
        start = max(0, index - 500)
        end = min(len(raw_text), index + 500)
        context = raw_text[start:end]
        category = _infer_category(context, default_category)
        price_match = PRICE_RE.search(context)
        price = _price_to_float(price_match.group("price")) if price_match else 0.0
        currency = _currency(price_match.group("currency") if price_match else None)

        if price <= 0:
            skipped += 1
            continue

        listings.append(
            {
                "external_id": url,
                "source": f"email_alert:{_domain(url)}",
                "category": category,
                "title": _title_from_context(context, url),
                "price": price,
                "currency": currency,
                "city": default_city,
                "district": default_district,
                "neighborhood": "",
                "listing_url": url,
                "image_url": None,
                "properties": _extract_properties(context, category),
                "contact": {},
                "notes": _clean_text(context)[:500],
            }
        )

    return EmailAlertParseResult(listings=listings, skipped_count=skipped)
