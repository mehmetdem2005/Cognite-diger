from typing import Any, Literal
from pydantic import BaseModel, Field

Category = Literal["konut", "arsa", "isyeri", "arac"]
SortMode = Literal["newest", "price_asc", "price_desc", "score_desc", "m2_price_asc"]
SourceType = Literal["json_feed", "rss_feed"]
JobStatus = Literal["queued", "running", "succeeded", "failed"]


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


class DataSourceIn(BaseModel):
    name: str = Field(min_length=1)
    source_type: SourceType
    url: str = Field(min_length=6)
    category: Category
    enabled: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class DataSourceOut(DataSourceIn):
    id: int
    last_status: str | None = None
    last_error: str | None = None
    last_synced_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class SourceSyncResult(BaseModel):
    source_id: int
    fetched_count: int
    imported_count: int
    skipped_count: int


class JobOut(BaseModel):
    id: int
    job_type: str
    status: JobStatus | str
    title: str
    payload: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None
    progress_current: int = 0
    progress_total: int = 0
    created_at: str | None = None
    started_at: str | None = None
    finished_at: str | None = None
    updated_at: str | None = None


class JobEventOut(BaseModel):
    id: int
    job_id: int
    level: str
    message: str
    data: dict[str, Any]
    created_at: str | None = None


class JobCreatedOut(BaseModel):
    job_id: int
    status_url: str


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
