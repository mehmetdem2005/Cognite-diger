from __future__ import annotations

import hashlib
import xml.etree.ElementTree as ET
from typing import Any

import httpx


def stable_external_id(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="ignore")).hexdigest()[:32]


def parse_number(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(str(value).replace(".", "").replace(",", "."))
    except Exception:
        return default


def normalize_feed_item(raw: dict[str, Any], category: str, source_name: str, source_mode: str) -> dict[str, Any]:
    title = str(raw.get("title") or raw.get("name") or raw.get("baslik") or "İsimsiz kayıt")
    url = raw.get("listing_url") or raw.get("url") or raw.get("link")
    external_id = str(raw.get("external_id") or raw.get("id") or raw.get("guid") or url or title)
    return {
        "external_id": stable_external_id(external_id),
        "source": source_name,
        "source_mode": source_mode,
        "category": raw.get("category") or category,
        "title": title,
        "price": parse_number(raw.get("price") or raw.get("fiyat")),
        "currency": raw.get("currency") or "TRY",
        "city": raw.get("city") or raw.get("il") or "",
        "district": raw.get("district") or raw.get("ilce") or "",
        "neighborhood": raw.get("neighborhood") or raw.get("mahalle") or "",
        "listing_url": url,
        "image_url": raw.get("image_url") or raw.get("image") or raw.get("gorsel"),
        "properties": raw.get("properties") or {},
        "contact": raw.get("contact") or {},
        "notes": raw.get("notes") or "Otomatik izinli kaynaktan geldi.",
    }


async def fetch_json_feed(url: str, category: str, source_name: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=45, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    if isinstance(data, dict):
        items = data.get("listings") or data.get("items") or data.get("data") or []
    elif isinstance(data, list):
        items = data
    else:
        items = []

    return [normalize_feed_item(item, category, source_name, "authorized_json_feed") for item in items if isinstance(item, dict)]


def _tag_text(item: ET.Element, tag: str) -> str | None:
    found = item.find(tag)
    return found.text.strip() if found is not None and found.text else None


async def fetch_rss_feed(url: str, category: str, source_name: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=45, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        text = resp.text

    root = ET.fromstring(text)
    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    normalized: list[dict[str, Any]] = []
    for item in items:
        title = _tag_text(item, "title") or _tag_text(item, "{http://www.w3.org/2005/Atom}title") or "RSS kaydı"
        link = _tag_text(item, "link")
        if not link:
            atom_link = item.find("{http://www.w3.org/2005/Atom}link")
            link = atom_link.attrib.get("href") if atom_link is not None else None
        description = _tag_text(item, "description") or _tag_text(item, "summary") or ""
        raw = {
            "title": title,
            "url": link,
            "notes": description,
            "external_id": _tag_text(item, "guid") or link or title,
            "price": 0,
        }
        normalized.append(normalize_feed_item(raw, category, source_name, "rss_or_open_feed"))
    return normalized


async def fetch_source_items(source: dict[str, Any]) -> list[dict[str, Any]]:
    source_type = source["source_type"]
    if source_type == "json_feed":
        return await fetch_json_feed(source["url"], source["category"], source["name"])
    if source_type == "rss_feed":
        return await fetch_rss_feed(source["url"], source["category"], source["name"])
    raise ValueError(f"Desteklenmeyen kaynak türü: {source_type}")
