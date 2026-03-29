from __future__ import annotations

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Groq ---
    groq_api_key: str = Field(default="", description="Groq API anahtarı")

    # --- Server ---
    port: int = Field(default=8000, ge=1, le=65535)
    debug: bool = Field(default=False, description="Debug modu")
    log_level: str = Field(default="INFO", description="Log seviyesi")

    # --- CORS ---
    allowed_origins: str = Field(
        default="*",
        description="Virgülle ayrılmış izinli origin'ler",
    )

    # --- Rate Limiting ---
    rate_limit_requests: int = Field(default=60, ge=1, description="Dakika başına istek limiti")
    rate_limit_window_seconds: int = Field(default=60, ge=1)

    # --- Cache ---
    cache_max_size: int = Field(default=1024, ge=1)
    cache_ttl_seconds: int = Field(default=300, ge=1)

    # --- PDF ---
    max_pdf_size_mb: int = Field(default=50, ge=1, le=200)

    # --- AI Models ---
    model_fast: str = "llama-3.1-8b-instant"
    model_quality: str = "llama-3.3-70b-versatile"
    model_balanced: str = "llama-3.1-70b-versatile"
    model_compound: str = "compound-beta"

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return upper

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def models_map(self) -> dict[str, str]:
        return {
            "fast": self.model_fast,
            "quality": self.model_quality,
            "balanced": self.model_balanced,
            "compound": self.model_compound,
        }

    @property
    def max_pdf_bytes(self) -> int:
        return self.max_pdf_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Singleton settings – cached after first call."""
    return Settings()
