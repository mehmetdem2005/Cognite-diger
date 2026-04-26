from __future__ import annotations

from pathlib import Path
from urllib.parse import quote_plus

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import add_listing, init_db, list_listings
from .models import ListingIn, ListingOut, SearchLinkOut, SearchLinkRequest, MeclisScanRequest
from .scoring import score_listing

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT / "frontend"

app = FastAPI(title="Fırsat Avcısı + Meclis Takip", version="0.1.0")

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
    score, risk = score_listing(data)
    listing_id = add_listing(data, score, risk)
    return {**data, "id": listing_id, "score": score, "risk_level": risk, "created_at": "şimdi"}


@app.get("/api/listings")
def get_listings(category: str | None = None, sort: str = "newest") -> list[dict]:
    return list_listings(category=category, sort=sort)


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
