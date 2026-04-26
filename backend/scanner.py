from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any


@dataclass
class KeywordHit:
    keyword: str
    count: int
    contexts: list[str]


def normalize_text(value: str) -> str:
    """Türkçe karakterleri de hesaba katan yumuşak normalize fonksiyonu."""
    value = value or ""
    value = value.casefold()
    value = value.replace("ı", "i").replace("İ", "i")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return value


def _context(original: str, start: int, end: int, window: int = 260) -> str:
    left = max(0, start - window)
    right = min(len(original), end + window)
    snippet = original[left:right].replace("\n", " ")
    return re.sub(r"\s+", " ", snippet).strip()


def scan_text(text: str, keywords: list[str], max_contexts_per_keyword: int = 5) -> dict[str, Any]:
    original = text or ""
    normalized = normalize_text(original)
    results: list[dict[str, Any]] = []
    total_hits = 0

    for raw_keyword in keywords:
        keyword = raw_keyword.strip()
        if not keyword:
            continue

        normalized_keyword = normalize_text(keyword)
        matches = list(re.finditer(re.escape(normalized_keyword), normalized))
        contexts: list[str] = []
        for match in matches[:max_contexts_per_keyword]:
            contexts.append(_context(original, match.start(), match.end()))

        count = len(matches)
        total_hits += count
        results.append({
            "keyword": keyword,
            "count": count,
            "found": count > 0,
            "contexts": contexts,
        })

    return {
        "total_hits": total_hits,
        "matched_keywords": sum(1 for item in results if item["found"]),
        "keywords": results,
        "text_length": len(original),
    }
