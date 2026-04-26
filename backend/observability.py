from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_ctx.get()),
        }
        for key in ("method", "path", "status_code", "duration_ms", "job_id", "job_type", "source_id", "user_id"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.setLevel(level.upper())
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RequestIdFilter())
    root.handlers.clear()
    root.addHandler(handler)


def new_request_id(value: str | None = None) -> str:
    if value and value.strip():
        return value.strip()[:128]
    return uuid.uuid4().hex


def set_request_id(request_id: str):
    return request_id_ctx.set(request_id)


def reset_request_id(token) -> None:
    request_id_ctx.reset(token)


def monotonic_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)
