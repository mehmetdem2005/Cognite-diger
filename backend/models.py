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
    municipality_name: str
    municipality_url: str | None = None
    keywords: list[str] = Field(default_factory=list)
