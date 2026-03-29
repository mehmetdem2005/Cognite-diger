from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger("cognita.middleware")


# ── Request ID Middleware ───────────────────────────────────────────


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request-id to every request/response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── Request Timing Middleware ───────────────────────────────────────


class TimingMiddleware(BaseHTTPMiddleware):
    """Log request duration and add X-Process-Time header."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Process-Time"] = f"{duration_ms}ms"

        request_id = getattr(request.state, "request_id", "-")
        logger.info(
            "%s %s → %s (%sms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


# ── Rate Limiting Middleware ────────────────────────────────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory per-IP sliding window rate limiter."""

    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._windows: dict[str, list[float]] = defaultdict(list)

    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate limiting for health & root
        if request.url.path in ("/", "/health"):
            return await call_next(request)

        ip = self._client_ip(request)
        now = time.time()
        window_start = now - self.window_seconds

        # Clean old entries
        events = [t for t in self._windows[ip] if t > window_start]
        self._windows[ip] = events

        if len(events) >= self.max_requests:
            reset_at = events[0] + self.window_seconds
            return Response(
                content='{"error":"Rate limit exceeded","detail":"Çok fazla istek gönderildi. Lütfen bekleyin."}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(int(reset_at - now)),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        events.append(now)
        self._windows[ip] = events

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(
            self.max_requests - len(events)
        )
        return response


# ── Security Headers Middleware ─────────────────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add common security headers to every response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
