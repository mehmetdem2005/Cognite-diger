from __future__ import annotations

import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "frontend"
DATA_DIR = ROOT_DIR / os.getenv("DATA_DIR", "data")


def _csv_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


APP_NAME = os.getenv("APP_NAME", "Fırsat Avcısı + Meclis Takip")
APP_VERSION = os.getenv("APP_VERSION", "0.8.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Development kolaylığı için default *; production deploy'da mutlaka gerçek domain yazılmalı.
CORS_ALLOWED_ORIGINS = _csv_env("CORS_ALLOWED_ORIGINS", "*")
CORS_ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() in {"1", "true", "yes", "on"}

ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "true").lower() in {"1", "true", "yes", "on"}
SOURCE_SYNC_INTERVAL_MINUTES = max(5, int(os.getenv("SOURCE_SYNC_INTERVAL_MINUTES", "60")))

MAX_FEED_ITEMS_PER_SYNC = max(1, int(os.getenv("MAX_FEED_ITEMS_PER_SYNC", "500")))
HTTP_TIMEOUT_SECONDS = max(5, int(os.getenv("HTTP_TIMEOUT_SECONDS", "45")))
