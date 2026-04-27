from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "frontend"
DATA_DIR = ROOT_DIR / os.getenv("DATA_DIR", "data")
DATABASE_ENGINE = os.getenv("DATABASE_ENGINE", "sqlite").lower().strip()
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "app.db")))
DATABASE_URL = os.getenv("DATABASE_URL", "")


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _bool_env(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in {"1", "true", "yes", "on"}


APP_NAME = os.getenv("APP_NAME", "Fırsat Avcısı + Meclis Takip")
APP_VERSION = os.getenv("APP_VERSION", "0.8.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Development kolaylığı için default *; production deploy'da mutlaka gerçek domain yazılmalı.
CORS_ALLOWED_ORIGINS = _csv_env("CORS_ALLOWED_ORIGINS", "*")
CORS_ALLOW_CREDENTIALS = _bool_env("CORS_ALLOW_CREDENTIALS", "false")

ENABLE_SCHEDULER = _bool_env("ENABLE_SCHEDULER", "true")
SOURCE_SYNC_INTERVAL_MINUTES = max(5, int(os.getenv("SOURCE_SYNC_INTERVAL_MINUTES", "60")))

MAX_FEED_ITEMS_PER_SYNC = max(1, int(os.getenv("MAX_FEED_ITEMS_PER_SYNC", "500")))
HTTP_TIMEOUT_SECONDS = max(5, int(os.getenv("HTTP_TIMEOUT_SECONDS", "45")))

RATE_LIMIT_ENABLED = _bool_env("RATE_LIMIT_ENABLED", "true")
RATE_LIMIT_REQUESTS_PER_MINUTE = max(10, int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "120")))
RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE = max(3, int(os.getenv("RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE", "20")))
RATE_LIMIT_IMPORT_REQUESTS_PER_MINUTE = max(3, int(os.getenv("RATE_LIMIT_IMPORT_REQUESTS_PER_MINUTE", "30")))

SECURITY_HEADERS_ENABLED = _bool_env("SECURITY_HEADERS_ENABLED", "true")
CONTENT_SECURITY_POLICY = os.getenv(
    "CONTENT_SECURITY_POLICY",
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' https: data:; "
    "font-src 'self' data:; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "frame-ancestors 'none'; "
    "form-action 'self'; "
    "upgrade-insecure-requests",
)
