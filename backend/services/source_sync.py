from __future__ import annotations

from typing import Any

from ..database import (
    add_listing,
    add_source_item,
    get_data_source,
    list_data_sources,
    source_item_exists,
    update_data_source_status,
)
from ..scoring import score_listing
from ..sources.feed_adapters import fetch_source_items


async def sync_source(source_id: int) -> dict[str, Any]:
    source = get_data_source(source_id)
    if not source:
        raise ValueError("Veri kaynağı bulunamadı.")
    if not source.get("enabled"):
        raise ValueError("Veri kaynağı pasif.")

    try:
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
        return {"source_id": source_id, "fetched_count": len(items), "imported_count": imported, "skipped_count": skipped}
    except Exception as exc:
        update_data_source_status(source_id, "error", str(exc))
        raise


async def sync_all_sources() -> dict[str, Any]:
    sources = [source for source in list_data_sources() if source.get("enabled")]
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for source in sources:
        try:
            results.append(await sync_source(int(source["id"])))
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
