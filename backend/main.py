from __future__ import annotations

import csv
import io
import json
import logging
import time
from urllib.parse import quote_plus

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from .auth import extract_bearer_token, get_current_user, login_user, logout_token, register_user
from .config import APP_NAME, APP_VERSION, CORS_ALLOWED_ORIGINS, CORS_ALLOW_CREDENTIALS, FRONTEND_DIR, LOG_LEVEL
from .database import (
    add_data_source,
    add_listing,
    add_saved_search,
    delete_data_source,
    delete_listing,
    delete_saved_search,
    get_conn,
    get_data_source,
    get_job,
    get_listing,
    get_saved_search,
    init_db,
    list_data_sources,
    list_job_events,
    list_jobs,
    list_listings,
    list_saved_searches,
    set_favorite,
)
from .models import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    DataSourceIn,
    DataSourceOut,
    FavoriteUpdate,
    ImportListingsRequest,
    ImportListingsResult,
    JobCreatedOut,
    JobEventOut,
    JobOut,
    ListingIn,
    ListingOut,
    MeclisScanRequest,
    MeclisScanResult,
    SavedSearchIn,
    SavedSearchOut,
    SearchLinkOut,
    SearchLinkRequest,
    SourceSyncResult,
    UserPublic,
)
from .observability import configure_logging, monotonic_ms, new_request_id, reset_request_id, set_request_id
from .pdf_utils import PdfExtractionError, extract_text_from_pdf_stream
from .scanner import scan_text
from .scheduler import start_scheduler, stop_scheduler
from .scoring import score_listing
from .services.job_runner import enqueue_job
from .services.source_sync import sync_all_sources, sync_source

configure_logging(LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_observability_and_security(request: Request, call_next):
    request_id = new_request_id(request.headers.get("X-Request-ID"))
    token = set_request_id(request_id)
    start = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = monotonic_ms(start)
        logger.info(
            "request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
    except Exception:
        duration_ms = monotonic_ms(start)
        logger.exception(
            "request failed",
            extra={"method": request.method, "path": request.url.path, "duration_ms": duration_ms},
        )
        reset_request_id(token)
        raise

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    reset_request_id(token)
    return response


@app.on_event("startup")
def _startup() -> None:
    init_db()
    logger.info("application startup", extra={"path": "startup"})
    start_scheduler()


@app.on_event("shutdown")
def _shutdown() -> None:
    logger.info("application shutdown", extra={"path": "shutdown"})
    stop_scheduler()


def _uid(user: dict) -> str:
    return str(user["id"])


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "project": "firsat-avcisi-meclis-takip", "version": APP_VERSION}


@app.get("/api/ready")
def ready() -> dict:
    try:
        with get_conn() as conn:
            conn.execute("SELECT 1").fetchone()
        return {"ok": True, "checks": {"database": "ok"}, "version": APP_VERSION}
    except Exception as exc:
        logger.exception("readiness check failed", extra={"path": "/api/ready"})
        raise HTTPException(status_code=503, detail={"ok": False, "checks": {"database": "error"}, "error": str(exc)}) from exc


@app.get("/api/policy")
def policy() -> dict:
    return {
        "scraping": "Gizli scraping, CAPTCHA aşma, CORS dolanma ve izinsiz toplu veri çekme yok.",
        "allowed_sources": ["resmî API", "izinli partner feed", "RSS/açık veri", "yetkili JSON/XML feed", "e-posta alarmı"],
    }


@app.post("/api/auth/register", response_model=AuthResponse)
def auth_register(payload: AuthRegisterRequest) -> dict:
    try:
        user, token = register_user(payload.email, payload.password, payload.full_name)
        logger.info("user registered", extra={"user_id": user.get("id")})
        return {"user": user, "token": token}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/auth/login", response_model=AuthResponse)
def auth_login(payload: AuthLoginRequest) -> dict:
    try:
        user, token = login_user(payload.email, payload.password)
        logger.info("user logged in", extra={"user_id": user.get("id")})
        return {"user": user, "token": token}
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.get("/api/auth/me", response_model=UserPublic)
def auth_me(user: dict = Depends(get_current_user)) -> dict:
    return user


@app.post("/api/auth/logout")
def auth_logout(user: dict = Depends(get_current_user), authorization: str | None = Header(default=None)) -> dict:
    token = extract_bearer_token(authorization)
    if token:
        logout_token(token)
    logger.info("user logged out", extra={"user_id": user.get("id")})
    return {"ok": True, "user_id": user["id"]}


@app.get("/api/jobs", response_model=list[JobOut])
def get_jobs(status: str | None = None, limit: int = Query(default=50, ge=1, le=200), user: dict = Depends(get_current_user)) -> list[dict]:
    return list_jobs(status=status, limit=limit, user_id=_uid(user))


@app.get("/api/jobs/{job_id}", response_model=JobOut)
def read_job(job_id: int, user: dict = Depends(get_current_user)) -> dict:
    job = get_job(job_id, user_id=_uid(user))
    if not job:
        raise HTTPException(status_code=404, detail="İş bulunamadı.")
    return job


@app.get("/api/jobs/{job_id}/events", response_model=list[JobEventOut])
def read_job_events(job_id: int, user: dict = Depends(get_current_user)) -> list[dict]:
    if not get_job(job_id, user_id=_uid(user)):
        raise HTTPException(status_code=404, detail="İş bulunamadı.")
    return list_job_events(job_id, user_id=_uid(user))


@app.post("/api/jobs/source-sync-all", response_model=JobCreatedOut)
async def enqueue_source_sync_all(user: dict = Depends(get_current_user)) -> dict:
    user_id = _uid(user)

    async def task(job_id: int) -> dict:
        return await sync_all_sources(job_id=job_id, user_id=user_id)

    job_id = enqueue_job(
        job_type="source_sync_all",
        title="Tüm veri kaynaklarını senkronize et",
        payload={},
        task=task,
        user_id=user_id,
    )
    logger.info("source sync all job enqueued", extra={"job_id": job_id, "job_type": "source_sync_all", "user_id": user_id})
    return {"job_id": job_id, "status_url": f"/api/jobs/{job_id}"}


@app.post("/api/listings", response_model=ListingOut)
def create_listing(payload: ListingIn, user: dict = Depends(get_current_user)) -> dict:
    data = payload.model_dump()
    score, risk, reasons = score_listing(data)
    listing_id = add_listing(data, score, risk, reasons, user_id=_uid(user))
    created = get_listing(listing_id, user_id=_uid(user))
    if not created:
        raise HTTPException(status_code=500, detail="İlan kaydedildi ama tekrar okunamadı.")
    return created


@app.get("/api/listings")
def get_listings(category: str | None = None, sort: str = "newest", q: str | None = None, city: str | None = None, district: str | None = None, favorites: bool = False, min_price: float | None = Query(default=None, ge=0), max_price: float | None = Query(default=None, ge=0), user: dict = Depends(get_current_user)) -> list[dict]:
    return list_listings(category=category, sort=sort, query_text=q, city=city, district=district, favorites_only=favorites, min_price=min_price, max_price=max_price, user_id=_uid(user))


@app.get("/api/listings/{listing_id}")
def read_listing(listing_id: int, user: dict = Depends(get_current_user)) -> dict:
    item = get_listing(listing_id, user_id=_uid(user))
    if not item:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return item


@app.patch("/api/listings/{listing_id}/favorite")
def update_favorite(listing_id: int, payload: FavoriteUpdate, user: dict = Depends(get_current_user)) -> dict:
    item = set_favorite(listing_id, payload.is_favorite, user_id=_uid(user))
    if not item:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return item


@app.delete("/api/listings/{listing_id}")
def remove_listing(listing_id: int, user: dict = Depends(get_current_user)) -> dict:
    deleted = delete_listing(listing_id, user_id=_uid(user))
    if not deleted:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
    return {"ok": True, "deleted_id": listing_id}


@app.get("/api/export/listings.json")
def export_listings_json(user: dict = Depends(get_current_user)) -> Response:
    payload = {"schema": "firsat-avcisi.listings.v1", "listings": list_listings(user_id=_uid(user))}
    return Response(content=json.dumps(payload, ensure_ascii=False, indent=2), media_type="application/json; charset=utf-8", headers={"Content-Disposition": "attachment; filename=firsat-avcisi-listings.json"})


@app.get("/api/export/listings.csv")
def export_listings_csv(user: dict = Depends(get_current_user)) -> Response:
    listings = list_listings(user_id=_uid(user))
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["id", "category", "title", "price", "currency", "city", "district", "neighborhood", "score", "risk_level", "is_favorite", "listing_url", "notes"], extrasaction="ignore")
    writer.writeheader()
    writer.writerows(listings)
    return Response(content="\ufeff" + buffer.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=firsat-avcisi-listings.csv"})


@app.post("/api/import/listings", response_model=ImportListingsResult)
def import_listings(payload: ImportListingsRequest, user: dict = Depends(get_current_user)) -> ImportListingsResult:
    imported = 0
    skipped = 0
    for listing in payload.listings:
        try:
            data = listing.model_dump()
            score, risk, reasons = score_listing(data)
            add_listing(data, score, risk, reasons, user_id=_uid(user))
            imported += 1
        except Exception:
            skipped += 1
    return ImportListingsResult(imported_count=imported, skipped_count=skipped)


@app.post("/api/data-sources", response_model=DataSourceOut)
def create_data_source(payload: DataSourceIn, user: dict = Depends(get_current_user)) -> dict:
    source_id = add_data_source(payload.model_dump(), user_id=_uid(user))
    source = get_data_source(source_id, user_id=_uid(user))
    if not source:
        raise HTTPException(status_code=500, detail="Kaynak kaydedildi ama tekrar okunamadı.")
    return source


@app.get("/api/data-sources", response_model=list[DataSourceOut])
def get_sources(user: dict = Depends(get_current_user)) -> list[dict]:
    return list_data_sources(user_id=_uid(user))


@app.get("/api/data-sources/{source_id}", response_model=DataSourceOut)
def read_source(source_id: int, user: dict = Depends(get_current_user)) -> dict:
    source = get_data_source(source_id, user_id=_uid(user))
    if not source:
        raise HTTPException(status_code=404, detail="Veri kaynağı bulunamadı.")
    return source


@app.delete("/api/data-sources/{source_id}")
def remove_source(source_id: int, user: dict = Depends(get_current_user)) -> dict:
    deleted = delete_data_source(source_id, user_id=_uid(user))
    if not deleted:
        raise HTTPException(status_code=404, detail="Veri kaynağı bulunamadı.")
    return {"ok": True, "deleted_id": source_id}


@app.post("/api/data-sources/{source_id}/sync", response_model=SourceSyncResult)
async def sync_data_source(source_id: int, user: dict = Depends(get_current_user)) -> dict:
    try:
        result = await sync_source(source_id, user_id=_uid(user))
        logger.info("source sync completed", extra={"source_id": source_id, "user_id": _uid(user)})
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("source sync failed", extra={"source_id": source_id, "user_id": _uid(user)})
        raise HTTPException(status_code=500, detail=f"Senkronizasyon başarısız: {exc}") from exc


@app.post("/api/data-sources/sync-all")
async def sync_all_data_sources(user: dict = Depends(get_current_user)) -> dict:
    return await sync_all_sources(user_id=_uid(user))


@app.post("/api/saved-searches", response_model=SavedSearchOut)
def create_saved_search(payload: SavedSearchIn, user: dict = Depends(get_current_user)) -> dict:
    search_id = add_saved_search(payload.model_dump(), user_id=_uid(user))
    saved = get_saved_search(search_id, user_id=_uid(user))
    if not saved:
        raise HTTPException(status_code=500, detail="Arama kaydedildi ama tekrar okunamadı.")
    return saved


@app.get("/api/saved-searches", response_model=list[SavedSearchOut])
def get_saved_searches(category: str | None = None, user: dict = Depends(get_current_user)) -> list[dict]:
    return list_saved_searches(category=category, user_id=_uid(user))


@app.get("/api/saved-searches/{search_id}", response_model=SavedSearchOut)
def read_saved_search(search_id: int, user: dict = Depends(get_current_user)) -> dict:
    saved = get_saved_search(search_id, user_id=_uid(user))
    if not saved:
        raise HTTPException(status_code=404, detail="Kayıtlı arama bulunamadı.")
    return saved


@app.delete("/api/saved-searches/{search_id}")
def remove_saved_search(search_id: int, user: dict = Depends(get_current_user)) -> dict:
    deleted = delete_saved_search(search_id, user_id=_uid(user))
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
