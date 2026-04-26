from __future__ import annotations

from typing import Any

from ..database import (
    add_job_event,
    add_listing,
    add_source_item,
    get_data_source,
    list_data_sources,
    source_item_exists,
    update_data_source_status,
    update_job_progress,
)
from ..scoring import score_listing
from ..sources.feed_adapters import fetch_source_items


async def sync_source(source_id: int, job_id: int | None = None, progress_index: int | None = None, progress_total: int | None = None) -> dict[str, Any]:
    source = get_data_source(source_id)
    if not source:
        raise ValueError("Veri kaynağı bulunamadı.")
    if not source.get("enabled"):
        raise ValueError("Veri kaynağı pasif.")

    try:
        if job_id:
            add_job_event(job_id, f"Kaynak çekiliyor: {source['name']}", data={"source_id": source_id})
        items = await fetch_source_items(source)
        imported = 0
        skipped = 0
        for item in items:
            external_id = item.pop("external_id")
            if source_item_exists(source_id, external_id):
                skipped += 1
                continue
            score, risk, reasons = score_listing(item)
            listing_id = add_listing(item, score, risk, reasons)
            add_source_item(source_id, external_id, listing_id)
            imported += 1
        update_data_source_status(source_id, "ok", None)
        result = {"source_id": source_id, "fetched_count": len(items), "imported_count": imported, "skipped_count": skipped}
        if job_id:
            add_job_event(job_id, f"Kaynak tamamlandı: {source['name']}", data=result)
            if progress_index is not None and progress_total is not None:
                update_job_progress(job_id, progress_index, progress_total)
        return result
    except Exception as exc:
        update_data_source_status(source_id, "error", str(exc))
        if job_id:
            add_job_event(job_id, f"Kaynak hata verdi: {source.get('name')}", level="error", data={"source_id": source_id, "error": str(exc)})
            if progress_index is not None and progress_total is not None:
                update_job_progress(job_id, progress_index, progress_total)
        raise


async def sync_all_sources(job_id: int | None = None) -> dict[str, Any]:
    sources = [source for source in list_data_sources() if source.get("enabled")]
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    if job_id:
        update_job_progress(job_id, 0, len(sources))
        add_job_event(job_id, f"{len(sources)} aktif kaynak senkronize edilecek.")

    for index, source in enumerate(sources, start=1):
        try:
            results.append(await sync_source(int(source["id"]), job_id=job_id, progress_index=index, progress_total=len(sources)))
        except Exception as exc:
            errors.append({"source_id": source.get("id"), "name": source.get("name"), "error": str(exc)})

    return {
        "source_count": len(sources),
        "success_count": len(results),
        "error_count": len(errors),
        "imported_count": sum(item.get("imported_count", 0) for item in results),
        "skipped_count": sum(item.get("skipped_count", 0) for item in results),
        "results": results,
        "errors": errors,
    }
