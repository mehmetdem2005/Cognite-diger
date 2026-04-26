from __future__ import annotations

from pathlib import Path
from urllib.parse import quote_plus

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import (
    add_listing,
    add_saved_search,
    delete_listing,
    delete_saved_search,
    get_listing,
    get_saved_search,
    init_db,
    list_listings,
    list_saved_searches,
    set_favorite,
)
from .models import (
    FavoriteUpdate,
    ListingIn,
    ListingOut,
    MeclisScanRequest,
    SavedSearchIn,
    SavedSearchOut,
    SearchLinkOut,
    SearchLinkRequest,
)
from .scoring import score_listing

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"

app = FastAPI(title="Fırsat Avcısı + Meclis Takip", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "project": "firsat-avcisi-meclis-takip"}


@app.get("/api/policy")
def policy() -> dict:
    return {
        "scraping": "Gizli scraping, CAPTCHA aşma, CORS dolanma ve izinsiz toplu veri çekme yok.",
        "allowed_sources": [
            "resmî API",
            "izinli partner feed",
            "kullanıcı onaylı manuel kayıt",
            "resmî site arama linki oluşturma",
            "uygulama içi güvenli görüntüleme",
        ],
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
def get_listings(
    category: str | None = None,
    sort: str = "newest",
    q: str | None = None,
    city: str | None = None,
    district: str | None = None,
    favorites: bool = False,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
) -> list[dict]:
    return list_listings(
        category=category,
        sort=sort,
        query_text=q,
        city=city,
        district=district,
        favorites_only=favorites,
        min_price=min_price,
        max_price=max_price,
    )


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
    parts = [payload.category, payload.city, payload.district, payload.neighborhood, payload.keywords]
    q = " ".join(str(p) for p in parts if p)
    encoded = quote_plus(q)

    links = [
        SearchLinkOut(
            source="sahibinden",
            url=f"https://www.sahibinden.com/arama?query={encoded}",
            note="Resmî site arama sayfası. Veri kazıma yapılmaz.",
        ),
        SearchLinkOut(
            source="hepsiemlak",
            url=f"https://www.hepsiemlak.com/ara?q={encoded}",
            note="Resmî site arama sayfası. Veri kazıma yapılmaz.",
        ),
        SearchLinkOut(
            source="arabam",
            url=f"https://www.arabam.com/ikinci-el/arama?searchText={encoded}",
            note="Resmî site arama sayfası. Veri kazıma yapılmaz.",
        ),
    ]
    return links


@app.post("/api/meclis/scan")
def meclis_scan(payload: MeclisScanRequest) -> dict:
    return {
        "status": "planned",
        "message": "PDF indirme, metin çıkarma ve OCR modülü sonraki fazda eklenecek.",
        "municipality_name": payload.municipality_name,
        "keywords": payload.keywords,
    }


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
