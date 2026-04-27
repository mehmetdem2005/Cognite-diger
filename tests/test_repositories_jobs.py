from __future__ import annotations

from backend.database import init_db
from backend.repositories.jobs import (
    add_job_event,
    create_job,
    get_job,
    list_job_events,
    list_jobs,
    mark_job_failed,
    mark_job_running,
    mark_job_succeeded,
    update_job_progress,
)


def test_job_lifecycle_and_events() -> None:
    init_db()
    job_id = create_job("source_sync_all", "Kaynak sync", payload={"a": 1}, progress_total=3, user_id="u1")

    job = get_job(job_id, user_id="u1")
    assert job is not None
    assert job["status"] == "queued"
    assert job["payload"] == {"a": 1}
    assert job["progress_total"] == 3

    mark_job_running(job_id)
    update_job_progress(job_id, 2, 3)
    event_id = add_job_event(job_id, "İki kaynak tamamlandı", data={"done": 2})
    assert event_id >= 1

    running = get_job(job_id, user_id="u1")
    assert running["status"] == "running"
    assert running["progress_current"] == 2

    events = list_job_events(job_id, user_id="u1")
    assert len(events) == 1
    assert events[0]["message"] == "İki kaynak tamamlandı"
    assert events[0]["data"] == {"done": 2}

    mark_job_succeeded(job_id, {"imported_count": 5})
    succeeded = get_job(job_id, user_id="u1")
    assert succeeded["status"] == "succeeded"
    assert succeeded["result"] == {"imported_count": 5}


def test_job_failed_state() -> None:
    init_db()
    job_id = create_job("test", "Test job", user_id="u1")

    mark_job_running(job_id)
    mark_job_failed(job_id, "boom")

    failed = get_job(job_id, user_id="u1")
    assert failed["status"] == "failed"
    assert failed["error"] == "boom"


def test_job_user_isolation() -> None:
    init_db()
    user_a_job = create_job("test", "A job", user_id="user-a")
    user_b_job = create_job("test", "B job", user_id="user-b")

    add_job_event(user_a_job, "A event")
    add_job_event(user_b_job, "B event")

    assert get_job(user_a_job, user_id="user-a") is not None
    assert get_job(user_a_job, user_id="user-b") is None

    assert [job["id"] for job in list_jobs(user_id="user-a")] == [user_a_job]
    assert [job["id"] for job in list_jobs(user_id="user-b")] == [user_b_job]

    assert len(list_job_events(user_a_job, user_id="user-a")) == 1
    assert list_job_events(user_a_job, user_id="user-b") == []
