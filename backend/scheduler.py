from __future__ import annotations

import logging
import os
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from .services.source_sync import sync_all_sources

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Europe/Istanbul")


def _minutes_from_env() -> int:
    raw = os.getenv("SOURCE_SYNC_INTERVAL_MINUTES", "60")
    try:
        return max(5, int(raw))
    except ValueError:
        return 60


async def scheduled_source_sync() -> dict[str, Any]:
    logger.info("scheduled source sync started")
    try:
        result = await sync_all_sources()
        logger.info("scheduled source sync completed", extra={"job_type": "scheduled_source_sync"})
        return result
    except Exception:
        logger.exception("scheduled source sync failed", extra={"job_type": "scheduled_source_sync"})
        raise


def start_scheduler() -> None:
    if os.getenv("ENABLE_SCHEDULER", "true").lower() not in {"1", "true", "yes", "on"}:
        logger.info("scheduler disabled")
        return
    if scheduler.running:
        logger.info("scheduler already running")
        return

    minutes = _minutes_from_env()
    scheduler.add_job(
        scheduled_source_sync,
        trigger=IntervalTrigger(minutes=minutes),
        id="source_sync_interval",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("scheduler started", extra={"job_type": "source_sync_interval"})


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("scheduler stopped")
