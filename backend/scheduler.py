from __future__ import annotations

import asyncio
import os
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .services.source_sync import sync_all_sources

scheduler = AsyncIOScheduler(timezone="Europe/Istanbul")


def _minutes_from_env() -> int:
    raw = os.getenv("SOURCE_SYNC_INTERVAL_MINUTES", "60")
    try:
        return max(5, int(raw))
    except ValueError:
        return 60


async def scheduled_source_sync() -> dict[str, Any]:
    return await sync_all_sources()


def start_scheduler() -> None:
    if os.getenv("ENABLE_SCHEDULER", "true").lower() not in {"1", "true", "yes", "on"}:
        return
    if scheduler.running:
        return

    scheduler.add_job(
        scheduled_source_sync,
        trigger=IntervalTrigger(minutes=_minutes_from_env()),
        id="source_sync_interval",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
