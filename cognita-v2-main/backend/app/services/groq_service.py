from __future__ import annotations

import json
import logging
import re
from typing import Any

from groq import AsyncGroq
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import Settings

logger = logging.getLogger("cognita.groq")


class GroqServiceError(Exception):
    """Groq API çağrısı sırasında oluşan hata."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _cleanup_json(content: str | None) -> str:
    """Remove markdown code fences from LLM output."""
    return re.sub(r"```(?:json)?|```", "", content or "").strip()


class GroqService:
    """Async Groq API service with retry logic and model resolution."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncGroq | None = None
        if settings.groq_api_key:
            self._client = AsyncGroq(api_key=settings.groq_api_key)

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    def _ensure_client(self) -> AsyncGroq:
        if self._client is None:
            raise GroqServiceError("Groq API anahtarı yapılandırılmamış", 503)
        return self._client

    def resolve_model(self, name: str) -> str:
        # Force all requests to use a single 120B model regardless of requested mode.
        return self._settings.groq_model

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
        reraise=True,
    )
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        *,
        max_tokens: int = 1000,
        temperature: float = 0.4,
        stream: bool = False,
    ) -> Any:
        """Send a chat completion request with automatic retry."""
        client = self._ensure_client()
        resolved = self.resolve_model(model)
        logger.info("Groq request: model=%s, stream=%s", resolved, stream)

        return await client.chat.completions.create(
            model=resolved,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

    async def ask_json(
        self,
        messages: list[dict[str, str]],
        model: str,
        *,
        max_tokens: int = 1000,
        temperature: float = 0.4,
    ) -> dict | list:
        """Send a request and parse the response as JSON."""
        completion = await self.chat_completion(
            messages, model, max_tokens=max_tokens, temperature=temperature
        )
        raw_content = completion.choices[0].message.content
        cleaned = _cleanup_json(raw_content)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("JSON parse hatası: %s — raw: %s", exc, cleaned[:200])
            raise GroqServiceError(
                f"AI yanıtı JSON olarak ayrıştırılamadı: {exc}", 502
            ) from exc

    async def stream_completion(
        self,
        messages: list[dict[str, str]],
        model: str,
        *,
        max_tokens: int = 900,
        temperature: float = 0.6,
    ):
        """Return an async stream of completion chunks."""
        return await self.chat_completion(
            messages,
            model,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )
