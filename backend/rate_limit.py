from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import HTTPException, Request


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    remaining: int
    retry_after_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        now = time.monotonic()
        bucket = self._buckets[key]
        cutoff = now - window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            return RateLimitDecision(False, 0, retry_after)

        bucket.append(now)
        return RateLimitDecision(True, max(0, limit - len(bucket)), 0)


rate_limiter = InMemoryRateLimiter()


def client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def path_limit(path: str, default_limit: int, auth_limit: int, import_limit: int) -> int:
    if path.startswith("/api/auth/"):
        return auth_limit
    if path.startswith("/api/import/") or path.endswith("/scan-pdf"):
        return import_limit
    return default_limit


def enforce_rate_limit(request: Request, limit: int) -> tuple[int, int]:
    key = f"{client_key(request)}:{request.url.path}"
    decision = rate_limiter.check(key, limit=limit)
    if not decision.allowed:
        raise HTTPException(
            status_code=429,
            detail="Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )
    return decision.remaining, decision.retry_after_seconds
