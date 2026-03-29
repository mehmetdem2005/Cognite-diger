from __future__ import annotations

import logging

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.services.groq_service import GroqServiceError

logger = logging.getLogger("cognita.exceptions")


async def groq_service_error_handler(
    request: Request, exc: GroqServiceError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    logger.error(
        "GroqServiceError [%s]: %s (status=%d)",
        request_id,
        exc.message,
        exc.status_code,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "AI Servis Hatası",
            "detail": exc.message,
            "request_id": request_id,
        },
    )


async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "request_id": request_id,
        },
    )


async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    logger.exception("Beklenmeyen hata [%s]: %s", request_id, exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Sunucu hatası",
            "detail": "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
            "request_id": request_id,
        },
    )
