from __future__ import annotations

import json
from typing import Any

from ..auth import LOCAL_USER_ID
from ..db.session import execute, execute_returning_id, fetch_all, fetch_one


def _decode_job(row) -> dict[str, Any]:
    item = dict(row)
    item["payload"] = json.loads(item.pop("payload_json") or "{}")
    item["result"] = json.loads(item.pop("result_json") or "null")
    return item


def _decode_event(row) -> dict[str, Any]:
    item = dict(row)
    item["data"] = json.loads(item.pop("data_json") or "{}")
    return item


def create_job(job_type: str, title: str, payload: dict[str, Any] | None = None, progress_total: int = 0, user_id: str = LOCAL_USER_ID) -> int:
    return execute_returning_id(
        """
        INSERT INTO jobs (user_id, job_type, title, payload_json, progress_total)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, job_type, title, json.dumps(payload or {}, ensure_ascii=False), progress_total),
    )


def get_job(job_id: int, user_id: str = LOCAL_USER_ID) -> dict[str, Any] | None:
    row = fetch_one("SELECT * FROM jobs WHERE id = ? AND user_id = ?", (job_id, user_id))
    return _decode_job(row) if row else None


def list_jobs(status: str | None = None, limit: int = 50, user_id: str = LOCAL_USER_ID) -> list[dict[str, Any]]:
    query = "SELECT * FROM jobs WHERE user_id = ?"
    params: list[Any] = [user_id]
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    return [_decode_job(row) for row in fetch_all(query, params)]


def mark_job_running(job_id: int) -> None:
    execute(
        """
        UPDATE jobs
        SET status = 'running', started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (job_id,),
    )


def update_job_progress(job_id: int, current: int, total: int | None = None) -> None:
    if total is None:
        execute(
            "UPDATE jobs SET progress_current = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (current, job_id),
        )
    else:
        execute(
            "UPDATE jobs SET progress_current = ?, progress_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (current, total, job_id),
        )


def mark_job_succeeded(job_id: int, result: dict[str, Any] | None = None) -> None:
    execute(
        """
        UPDATE jobs
        SET status = 'succeeded', result_json = ?, finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (json.dumps(result or {}, ensure_ascii=False), job_id),
    )


def mark_job_failed(job_id: int, error: str) -> None:
    execute(
        """
        UPDATE jobs
        SET status = 'failed', error = ?, finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (error, job_id),
    )


def add_job_event(job_id: int, message: str, level: str = "info", data: dict[str, Any] | None = None) -> int:
    return execute_returning_id(
        """
        INSERT INTO job_events (job_id, level, message, data_json)
        VALUES (?, ?, ?, ?)
        """,
        (job_id, level, message, json.dumps(data or {}, ensure_ascii=False)),
    )


def list_job_events(job_id: int, user_id: str = LOCAL_USER_ID) -> list[dict[str, Any]]:
    rows = fetch_all(
        """
        SELECT e.*
        FROM job_events e
        JOIN jobs j ON j.id = e.job_id
        WHERE e.job_id = ? AND j.user_id = ?
        ORDER BY e.id ASC
        """,
        (job_id, user_id),
    )
    return [_decode_event(row) for row in rows]
