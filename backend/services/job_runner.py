from __future__ import annotations

import asyncio
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

JobCallable = Callable[[int], Awaitable[dict[str, Any]]]


async def run_job(job_id: int, task: JobCallable) -> None:
    mark_job_running(job_id)
    add_job_event(job_id, "İş başladı.")
    try:
        result = await task(job_id)
        mark_job_succeeded(job_id, result)
        add_job_event(job_id, "İş başarıyla tamamlandı.", data=result)
    except Exception as exc:
        mark_job_failed(job_id, str(exc))
        add_job_event(job_id, "İş hata ile sonuçlandı.", level="error", data={"error": str(exc)})


def enqueue_job(job_type: str, title: str, payload: dict[str, Any], task: JobCallable, progress_total: int = 0, user_id: str = LOCAL_USER_ID) -> int:
    job_id = create_job(job_type=job_type, title=title, payload=payload, progress_total=progress_total, user_id=user_id)
    asyncio.create_task(run_job(job_id, task))
    return job_id
