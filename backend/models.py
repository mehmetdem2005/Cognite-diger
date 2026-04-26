from typing import Any, Literal
from pydantic import BaseModel, Field

Category = Literal["konut", "arsa", "isyeri", "arac"]
SortMode = Literal["newest", "price_asc", "price_desc", "score_desc", "m2_price_asc"]


class ListingIn(BaseModel):
    source: str = Field(default="manual", examples=["manual", "official_api", "partner_feed"])
    category: Category
    title: str
    price: float = Field(ge=0)
    currency: str = "TRY"
    city: str = ""
    district: str = ""
    neighborhood: str = ""
    listing_url: str | None = None
    image_url: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)
    contact: dict[str, Any] = Field(default_factory=dict)
    notes: str = ""
    is_favorite: bool = False


class ListingOut(ListingIn):
    id: int
    score: float
    risk_level: str
    score_reasons: list[str] = Field(default_factory=list)
    created_at: str


class FavoriteUpdate(BaseModel):
    is_favorite: bool


class SavedSearchIn(BaseModel):
    name: str = Field(min_length=1)
    category: Category
    filters: dict[str, Any] = Field(default_factory=dict)
    sort_mode: SortMode = "newest"
    notification_enabled: bool = False


class SavedSearchOut(SavedSearchIn):
    id: int
    created_at: str
    updated_at: str | None = None


class ImportListingsRequest(BaseModel):
    listings: list[ListingIn] = Field(default_factory=list)


class ImportListingsResult(BaseModel):
    imported_count: int
    skipped_count: int = 0


class SearchLinkRequest(BaseModel):
    category: Category
    city: str = ""
    district: str = ""
    neighborhood: str = ""
    min_price: float | None = None
    max_price: float | None = None
    keywords: str = ""


class SearchLinkOut(BaseModel):
    source: str
    url: str
    note: str


class MeclisScanRequest(BaseModel):
    municipality_name: str = ""
    municipality_url: str | None = None
    keywords: list[str] = Field(default_factory=list)
    text: str = ""


class MeclisScanResult(BaseModel):
    source_type: str
    municipality_name: str = ""
    total_hits: int
    matched_keywords: int
    text_length: int
    keywords: list[dict[str, Any]]
    pdf: dict[str, Any] | None = None
