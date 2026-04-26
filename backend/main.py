from __future__ import annotations

import csv
import io
import json
from urllib.parse import quote_plus

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_VERSION, CORS_ALLOWED_ORIGINS, CORS_ALLOW_CREDENTIALS, FRONTEND_DIR
from .database import (
    add_data_source,
    add_listing,
    add_saved_search,
    delete_data_source,
    delete_listing,
    delete_saved_search,
    get_data_source,
    get_listing,
    get_saved_search,
    init_db,
    list_data_sources,
    list_listings,
    list_saved_searches,
    set_favorite,
)
from .models import (
    DataSourceIn,
    DataSourceOut,
    FavoriteUpdate,
    ImportListingsRequest,
    ImportListingsResult,
    ListingIn,
    ListingOut,
    MeclisScanRequest,
    MeclisScanResult,
    SavedSearchIn,
    SavedSearchOut,
    SearchLinkOut,
    SearchLinkRequest,
    SourceSyncResult,
)
from .pdf_utils import PdfExtractionError, extract_text_from_pdf_stream
from .scanner import scan_text
from .scheduler import start_scheduler, stop_scheduler
from .scoring import score_listing
from .services.source_sync import sync_all_sources, sync_source

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()
    start_scheduler()


@app.on_event("shutdown")
def _shutdown() -> None:
    stop_scheduler()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "project": "firsat-avcisi-meclis-takip", "version": APP_VERSION}


@app.get("/api/policy")
def policy() -> dict:
    return {
        "scraping": "Gizli scraping, CAPTCHA aşma, CORS dolanma ve izinsiz toplu veri çekme yok.",
        "allowed_sources": ["resmî API", "izinli partner feed", "RSS/açık veri", "yetkili JSON/XML feed", "e-posta alarmı"],
    }


@app.post("/api/listings", response_model=ListingOut)
def create_listing(payload: ListingIn) -> dict:
    data = payload.model_dump()
    score, risk, reasons = score_listing(data)
    listing_id = add_listing(data, score, risk, reasons)
    created = get_listing(listing_id)
    if not created:
        raise HTTPException(status_code=500, detail="İlan kaydedildi ama tekrar okunamadı.")
    return created


@app.get("/api/listings")
def get_listings(category: str | None = None, sort: str = "newest", q: str | None = None, city: str | None = None, district: str | None = None, favorites: bool = False, min_price: float | None = Query(default=None, ge=0), max_price: float | None = Query(default=None, ge=0)) -> list[dict]:
    return list_listings(category=category, sort=sort, query_text=q, city=city, district=district, favorites_only=favorites, min_price=min_price, max_price=max_price)


@app.get("/api/listings/{listing_id}")
def read_listing(listing_id: int) -> dict:
    item = get_listing(listing_id)
    if not item:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return item


@app.patch("/api/listings/{listing_id}/favorite")
def update_favorite(listing_id: int, payload: FavoriteUpdate) -> dict:
    item = set_favorite(listing_id, payload.is_favorite)
    if not item:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return item


@app.delete("/api/listings/{listing_id}")
def remove_listing(listing_id: int) -> dict:
    deleted = delete_listing(listing_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return {"ok": True, "deleted_id": listing_id}


@app.get("/api/export/listings.json")
def export_listings_json() -> Response:
    payload = {"schema": "firsat-avcisi.listings.v1", "listings": list_listings()}
    return Response(content=json.dumps(payload, ensure_ascii=False, indent=2), media_type="application/json; charset=utf-8", headers={"Content-Disposition": "attachment; filename=firsat-avcisi-listings.json"})


@app.get("/api/export/listings.csv")
def export_listings_csv() -> Response:
    listings = list_listings()
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["id", "category", "title", "price", "currency", "city", "district", "neighborhood", "score", "risk_level", "is_favorite", "listing_url", "notes"], extrasaction="ignore")
    writer.writeheader()
    writer.writerows(listings)
    return Response(content="\ufeff" + buffer.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=firsat-avcisi-listings.csv"})


@app.post("/api/import/listings", response_model=ImportListingsResult)
def import_listings(payload: ImportListingsRequest) -> ImportListingsResult:
    imported = 0
    skipped = 0
    for listing in payload.listings:
        try:
            data = listing.model_dump()
            score, risk, reasons = score_listing(data)
            add_listing(data, score, risk, reasons)
            imported += 1
        except Exception:
            skipped += 1
    return ImportListingsResult(imported_count=imported, skipped_count=skipped)


@app.post("/api/data-sources", response_model=DataSourceOut)
def create_data_source(payload: DataSourceIn) -> dict:
    source_id = add_data_source(payload.model_dump())
    source = get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=500, detail="Kaynak kaydedildi ama tekrar okunamadı.")
    return source


@app.get("/api/data-sources", response_model=list[DataSourceOut])
def get_sources() -> list[dict]:
    return list_data_sources()


@app.get("/api/data-sources/{source_id}", response_model=DataSourceOut)
def read_source(source_id: int) -> dict:
    source = get_data_source(source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Veri kaynağı bulunamadı.")
    return source


@app.delete("/api/data-sources/{source_id}")
def remove_source(source_id: int) -> dict:
    deleted = delete_data_source(source_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Veri kaynağı bulunamadı.")
    return {"ok": True, "deleted_id": source_id}


@app.post("/api/data-sources/{source_id}/sync", response_model=SourceSyncResult)
async def sync_data_source(source_id: int) -> dict:
    try:
        return await sync_source(source_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Senkronizasyon başarısız: {exc}") from exc


@app.post("/api/data-sources/sync-all")
async def sync_all_data_sources() -> dict:
    return await sync_all_sources()


@app.post("/api/saved-searches", response_model=SavedSearchOut)
def create_saved_search(payload: SavedSearchIn) -> dict:
    search_id = add_saved_search(payload.model_dump())
    saved = get_saved_search(search_id)
    if not saved:
        raise HTTPException(status_code=500, detail="Arama kaydedildi ama tekrar okunamadı.")
    return saved


@app.get("/api/saved-searches", response_model=list[SavedSearchOut])
def get_saved_searches(category: str | None = None) -> list[dict]:
    return list_saved_searches(category=category)


@app.get("/api/saved-searches/{search_id}", response_model=SavedSearchOut)
def read_saved_search(search_id: int) -> dict:
    saved = get_saved_search(search_id)
    if not saved:
        raise HTTPException(status_code=404, detail="Kayıtlı arama bulunamadı.")
    return saved


@app.delete("/api/saved-searches/{search_id}")
def remove_saved_search(search_id: int) -> dict:
    deleted = delete_saved_search(search_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Kayıtlı arama bulunamadı.")
    return {"ok": True, "deleted_id": search_id}


@app.post("/api/search-links", response_model=list[SearchLinkOut])
def build_search_links(payload: SearchLinkRequest) -> list[SearchLinkOut]:
    q = " ".join(str(p) for p in [payload.category, payload.city, payload.district, payload.neighborhood, payload.keywords] if p)
    encoded = quote_plus(q)
    return [SearchLinkOut(source="sahibinden", url=f"https://www.sahibinden.com/arama?query={encoded}", note="Resmî site arama sayfası. Veri kazıma yapılmaz."), SearchLinkOut(source="hepsiemlak", url=f"https://www.hepsiemlak.com/ara?q={encoded}", note="Resmî site arama sayfası. Veri kazıma yapılmaz."), SearchLinkOut(source="arabam", url=f"https://www.arabam.com/ikinci-el/arama?searchText={encoded}", note="Resmî site arama sayfası. Veri kazıma yapılmaz.")]


@app.post("/api/meclis/scan", response_model=MeclisScanResult)
def meclis_scan(payload: MeclisScanRequest) -> dict:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Taranacak metin boş.")
    if not payload.keywords:
        raise HTTPException(status_code=400, detail="En az bir anahtar kelime gir.")
    result = scan_text(payload.text, payload.keywords)
    return {"source_type": "text", "municipality_name": payload.municipality_name, **result, "pdf": None}


@app.post("/api/meclis/scan-pdf", response_model=MeclisScanResult)
async def meclis_scan_pdf(file: UploadFile = File(...), keywords_json: str = "[]", municipality_name: str = "") -> dict:
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir.")
    try:
        keywords = json.loads(keywords_json)
        if not isinstance(keywords, list):
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail="Anahtar kelimeler JSON listesi olmalı.")
    if not keywords:
        raise HTTPException(status_code=400, detail="En az bir anahtar kelime gir.")
    try:
        pdf_info = extract_text_from_pdf_stream(file.file)
    except PdfExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    result = scan_text(pdf_info["text"], keywords)
    return {"source_type": "pdf", "municipality_name": municipality_name, **result, "pdf": {"filename": file.filename, "page_count": pdf_info["page_count"], "text_length": pdf_info["text_length"], "needs_ocr": pdf_info["needs_ocr"], "pages": pdf_info["pages"]}}


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
