import pytest

from app.config import Settings


# ── Root & Health ───────────────────────────────────────────────────


class TestRootAndHealth:
    def test_root(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Cognita API"
        assert data["version"] == "6.0.0"
        assert "features" in data
        assert "flashcards" in data["features"]

    def test_health(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "version" in data
        assert "cache_size" in data

    def test_request_id_header(self, client):
        res = client.get("/")
        assert "x-request-id" in res.headers

    def test_custom_request_id(self, client):
        res = client.get("/", headers={"X-Request-ID": "my-custom-id"})
        assert res.headers["x-request-id"] == "my-custom-id"

    def test_process_time_header(self, client):
        res = client.get("/")
        assert "x-process-time" in res.headers

    def test_security_headers(self, client):
        res = client.get("/")
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"


# ── PDF Extract ─────────────────────────────────────────────────────


class TestPDFExtract:
    def test_invalid_content_type(self, client):
        res = client.post(
            "/api/pdf/extract",
            files={"file": ("test.txt", b"not a pdf", "text/plain")},
        )
        assert res.status_code == 400
        assert "Geçersiz dosya tipi" in res.json()["error"]


# ── AI Input Validation ────────────────────────────────────────────


class TestInputValidation:
    def test_flashcard_missing_text(self, client):
        res = client.post("/api/ai/flashcards", json={"count": 5})
        assert res.status_code == 422

    def test_flashcard_text_too_short(self, client):
        res = client.post(
            "/api/ai/flashcards",
            json={"text": "kısa", "count": 5},
        )
        assert res.status_code == 422

    def test_flashcard_invalid_model(self, client):
        res = client.post(
            "/api/ai/flashcards",
            json={"text": "a" * 20, "model": "invalid"},
        )
        assert res.status_code == 422

    def test_flashcard_count_too_high(self, client):
        res = client.post(
            "/api/ai/flashcards",
            json={"text": "a" * 20, "count": 999},
        )
        assert res.status_code == 422

    def test_quiz_invalid_difficulty(self, client):
        res = client.post(
            "/api/ai/quiz",
            json={"text": "a" * 20, "difficulty": "extreme"},
        )
        assert res.status_code == 422

    def test_chat_message_required(self, client):
        res = client.post("/api/ai/chat", json={})
        assert res.status_code == 422

    def test_analyze_text_required(self, client):
        res = client.post("/api/ai/analyze", json={})
        assert res.status_code == 422


# ── Config ──────────────────────────────────────────────────────────


class TestConfig:
    def test_settings_defaults(self):
        s = Settings(groq_api_key="")
        assert s.port == 8000
        assert s.rate_limit_requests == 60
        assert s.cache_max_size == 1024
        assert s.max_pdf_size_mb == 50

    def test_origins_list(self):
        s = Settings(groq_api_key="", allowed_origins="http://a.com, http://b.com")
        assert s.origins_list == ["http://a.com", "http://b.com"]

    def test_models_map(self):
        s = Settings(groq_api_key="")
        m = s.models_map
        assert "fast" in m
        assert "quality" in m
        assert "balanced" in m
        assert "compound" in m

    def test_invalid_log_level(self):
        with pytest.raises(Exception):
            Settings(groq_api_key="", log_level="INVALID")


# ── Cache Service ───────────────────────────────────────────────────


class TestCacheService:
    def test_set_and_get(self, settings):
        from app.services.cache_service import CacheService

        cache = CacheService(settings)
        cache.set("key1", {"data": "test"})
        assert cache.get("key1") == {"data": "test"}
        assert cache.size == 1

    def test_cache_miss(self, settings):
        from app.services.cache_service import CacheService

        cache = CacheService(settings)
        assert cache.get("nonexistent") is None

    def test_make_key(self):
        from app.services.cache_service import CacheService

        key1 = CacheService.make_key("prefix", "data1")
        key2 = CacheService.make_key("prefix", "data2")
        assert key1 != key2
        assert key1.startswith("prefix:")

    def test_clear(self, settings):
        from app.services.cache_service import CacheService

        cache = CacheService(settings)
        cache.set("k1", "v1")
        cache.set("k2", "v2")
        assert cache.size == 2
        cache.clear()
        assert cache.size == 0


# ── Groq Service ────────────────────────────────────────────────────


class TestGroqService:
    def test_is_configured(self, settings):
        from app.services.groq_service import GroqService

        svc = GroqService(settings)
        assert svc.is_configured is True

    def test_not_configured(self):
        from app.services.groq_service import GroqService

        s = Settings(groq_api_key="")
        svc = GroqService(s)
        assert svc.is_configured is False

    def test_resolve_model(self, settings):
        from app.services.groq_service import GroqService

        svc = GroqService(settings)
        assert svc.resolve_model("fast") == "llama-3.1-8b-instant"
        assert svc.resolve_model("unknown") == settings.model_quality


# ── Schemas ─────────────────────────────────────────────────────────


class TestSchemas:
    def test_recommend_request_sanitizes_items(self):
        from app.models.schemas import RecommendRequest

        req = RecommendRequest(books=["  Book 1  ", "", "Book 2"], interests=["AI"])
        assert req.books == ["Book 1", "Book 2"]
        assert req.interests == ["AI"]

    def test_health_response(self):
        from app.models.schemas import HealthResponse

        hr = HealthResponse(
            status="ok",
            groq_configured=True,
            cache_size=10,
            timestamp="2024-01-01T00:00:00Z",
            version="6.0.0",
        )
        assert hr.status == "ok"
