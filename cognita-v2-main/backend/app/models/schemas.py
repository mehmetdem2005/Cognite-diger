from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


# ── Request Models ──────────────────────────────────────────────────


class FlashcardRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000, description="Kaynak metin")
    book_title: str = Field(default="", max_length=500)
    count: int = Field(default=5, ge=1, le=50, description="Flashcard sayısı")
    model: str = Field(default="fast", pattern=r"^(fast|quality|balanced|compound)$")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000, description="Analiz edilecek metin")
    book_title: str = Field(default="", max_length=500)
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10_000, description="Kullanıcı mesajı")
    book_content: str = Field(default="", max_length=50_000)
    book_title: str = Field(default="", max_length=500)
    model: str = Field(default="fast", pattern=r"^(fast|quality|balanced|compound)$")
    stream: bool = False


class WritingAssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10_000)
    genre: str = Field(default="", max_length=200)
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")


class QuizRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000)
    book_title: str = Field(default="", max_length=500)
    question_count: int = Field(default=5, ge=1, le=30)
    difficulty: str = Field(default="orta", pattern=r"^(kolay|orta|zor)$")
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")


class VocabularyRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000)
    language: str = Field(default="tr", min_length=2, max_length=5)
    count: int = Field(default=10, ge=1, le=50)
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")


class SummaryRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=50_000)
    book_title: str = Field(default="", max_length=500)
    length: str = Field(default="orta", pattern=r"^(kısa|orta|uzun)$")
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")


class RecommendRequest(BaseModel):
    books: list[str] = Field(default_factory=list, max_length=50)
    interests: list[str] = Field(default_factory=list, max_length=50)
    model: str = Field(default="quality", pattern=r"^(fast|quality|balanced|compound)$")

    @field_validator("books", "interests")
    @classmethod
    def validate_list_items(cls, v: list[str]) -> list[str]:
        return [item.strip()[:200] for item in v if item.strip()]


# ── Response Models ─────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    groq_configured: bool
    cache_size: int
    timestamp: str
    version: str


class PDFExtractResponse(BaseModel):
    text: str
    pages: int
    word_count: int
    char_count: int
    estimated_read_minutes: int
    estimated_read_hours: float


class ChatResponse(BaseModel):
    response: str


class WritingAssistantResponse(BaseModel):
    response: str


class ErrorResponse(BaseModel):
    error: str
    detail: str = ""
    request_id: str = ""
