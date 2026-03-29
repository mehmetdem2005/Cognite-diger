from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import get_settings
from app.dependencies import get_cache_service, get_groq_service
from app.models.schemas import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/", summary="API bilgileri")
async def root():
    return {
        "name": "Cognita API",
        "version": "6.0.0",
        "features": [
            "pdf_extract",
            "flashcards",
            "analyze",
            "chat_streaming",
            "writing_assistant",
            "quiz",
            "vocabulary",
            "summary",
            "recommend",
        ],
    }


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Sağlık durumu kontrolü",
)
async def health():
    settings = get_settings()
    groq = get_groq_service()
    cache = get_cache_service()

    return HealthResponse(
        status="ok",
        groq_configured=groq.is_configured,
        cache_size=cache.size,
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="6.0.0",
    )
