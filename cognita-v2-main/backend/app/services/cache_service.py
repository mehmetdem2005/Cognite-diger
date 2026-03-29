from __future__ import annotations

import hashlib
import logging
from typing import Any

from cachetools import TTLCache

from app.config import Settings

logger = logging.getLogger("cognita.cache")


class CacheService:
    """In-memory TTL cache for AI responses."""

    def __init__(self, settings: Settings) -> None:
        self._cache: TTLCache = TTLCache(
            maxsize=settings.cache_max_size,
            ttl=settings.cache_ttl_seconds,
        )

    @staticmethod
    def make_key(prefix: str, payload: str) -> str:
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"

    def get(self, key: str) -> Any | None:
        value = self._cache.get(key)
        if value is not None:
            logger.debug("Cache hit: %s", key)
        return value

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = value
        logger.debug("Cache set: %s", key)

    @property
    def size(self) -> int:
        return len(self._cache)

    def clear(self) -> None:
        self._cache.clear()
        logger.info("Cache cleared")
