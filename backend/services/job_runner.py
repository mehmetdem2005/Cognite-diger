from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

from ..auth import LOCAL_USER_ID
from ..database import (
    add_job_event,
    create_job,
    mark_job_failed,
    mark_job_running,
    mark_job_succeeded,
)

logger = logging.getLogger(__name__)
JobCallable = Callable[[int], Awaitable[dict[str, Any]]]


async def run_job(job_id: int, task: JobCallable, job_type: str = "unknown", user_id: str = LOCAL_USER_ID) -> None:
    mark_job_running(job_id)
    add_job_event(job_id, "İş başladı.")
    logger.info("job started", extra={"job_id": job_id, "job_type": job_type, "user_id": user_id})
    try:
        result = await task(job_id)
        mark_job_succeeded(job_id, result)
        add_job_event(job_id, "İş başarıyla tamamlandı.", data=result)
        logger.info("job succeeded", extra={"job_id": job_id, "job_type": job_type, "user_id": user_id})
    except Exception as exc:
        mark_job_failed(job_id, str(exc))
        add_job_event(job_id, "İş hata ile sonuçlandı.", level="error", data={"error": str(exc)})
        logger.exception("job failed", extra={"job_id": job_id, "job_type": job_type, "user_id": user_id})


def enqueue_job(job_type: str, title: str, payload: dict[str, Any], task: JobCallable, progress_total: int = 0, user_id: str = LOCAL_USER_ID) -> int:
    job_id = create_job(job_type=job_type, title=title, payload=payload, progress_total=progress_total, user_id=user_id)
    asyncio.create_task(run_job(job_id, task, job_type=job_type, user_id=user_id))
    logger.info("job enqueued", extra={"job_id": job_id, "job_type": job_type, "user_id": user_id})
    return job_id
