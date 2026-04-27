from fastapi.testclient import TestClient

from backend.rate_limit import InMemoryRateLimiter


def test_in_memory_rate_limiter_blocks_after_limit() -> None:
    limiter = InMemoryRateLimiter()

    first = limiter.check("client:path", limit=2, window_seconds=60)
    second = limiter.check("client:path", limit=2, window_seconds=60)
    third = limiter.check("client:path", limit=2, window_seconds=60)

    assert first.allowed is True
    assert second.allowed is True
    assert third.allowed is False
    assert third.retry_after_seconds >= 1


def test_rate_limit_headers_are_returned() -> None:
    from backend.main import app

    client = TestClient(app)
    response = client.get("/api/health")

    assert response.status_code == 200
    assert "X-RateLimit-Remaining" in response.headers
