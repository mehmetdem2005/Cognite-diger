from __future__ import annotations

from app.config import Settings, get_settings
from app.services.cache_service import CacheService
from app.services.groq_service import GroqService

# Lazy singletons – created once, reused across requests.
_groq_service: GroqService | None = None
_cache_service: CacheService | None = None


def get_groq_service() -> GroqService:
    global _groq_service
    if _groq_service is None:
        _groq_service = GroqService(get_settings())
    return _groq_service


def get_cache_service() -> CacheService:
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService(get_settings())
    return _cache_service


def reset_services() -> None:
    """Reset singletons – useful for testing."""
    global _groq_service, _cache_service
    _groq_service = None
    _cache_service = None
