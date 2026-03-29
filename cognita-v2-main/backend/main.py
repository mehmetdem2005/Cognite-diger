"""Cognita API – v6.0.0

Production-ready FastAPI backend with modular architecture,
structured logging, rate limiting, retry logic, and proper error handling.
"""
from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.dependencies import get_cache_service, get_groq_service, reset_services
from app.exceptions import (
    generic_exception_handler,
    groq_service_error_handler,
    http_exception_handler,
)
from app.middleware import (
    RateLimitMiddleware,
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
    TimingMiddleware,
)
from app.routers import ai, health, pdf
from app.services.groq_service import GroqServiceError

load_dotenv()


def _configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    # Silence noisy libraries
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown logic."""
    _configure_logging()
    logger = logging.getLogger("cognita")

    settings = get_settings()
    groq_svc = get_groq_service()
    cache_svc = get_cache_service()

    logger.info("=" * 60)
    logger.info("Cognita API v6.0.0 starting")
    logger.info("  Groq configured: %s", groq_svc.is_configured)
    logger.info("  Rate limit: %d req / %ds", settings.rate_limit_requests, settings.rate_limit_window_seconds)
    logger.info("  Cache: maxsize=%d, ttl=%ds", settings.cache_max_size, settings.cache_ttl_seconds)
    logger.info("  Max PDF size: %dMB", settings.max_pdf_size_mb)
    logger.info("  CORS origins: %s", settings.origins_list)
    logger.info("=" * 60)

    yield  # Application runs

    logger.info("Cognita API shutting down – clearing cache")
    cache_svc.clear()
    reset_services()


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="Cognita API",
        version="6.0.0",
        description="AI-powered reading companion backend",
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost first) ──
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
    app.add_middleware(TimingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ──
    app.add_exception_handler(GroqServiceError, groq_service_error_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # ── Routers ──
    app.include_router(health.router)
    app.include_router(pdf.router)
    app.include_router(ai.router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", str(settings.port))),
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
