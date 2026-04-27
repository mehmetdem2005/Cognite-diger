from fastapi.testclient import TestClient


def test_health_and_ready_endpoints() -> None:
    from backend.main import app

    client = TestClient(app)

    health = client.get("/api/health")
    ready = client.get("/api/ready")

    assert health.status_code == 200
    assert health.json()["ok"] is True
    assert ready.status_code == 200
    assert ready.json()["checks"]["database"] == "ok"


def test_request_id_and_security_headers_are_returned() -> None:
    from backend.main import app

    client = TestClient(app)
    response = client.get("/api/health", headers={"X-Request-ID": "test-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"
    assert response.headers["Content-Security-Policy"]
    assert "default-src 'self'" in response.headers["Content-Security-Policy"]
    assert "object-src 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert "geolocation=()" in response.headers["Permissions-Policy"]
