from __future__ import annotations

import io
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pypdf import PdfReader

from app.config import get_settings
from app.models.schemas import PDFExtractResponse

logger = logging.getLogger("cognita.pdf")

router = APIRouter(prefix="/api/pdf", tags=["PDF"])


@router.post(
    "/extract",
    response_model=PDFExtractResponse,
    summary="PDF dosyasından metin çıkar",
)
async def extract_pdf(file: UploadFile = File(...)):
    settings = get_settings()

    # Validate content type
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz dosya tipi: {file.content_type}. Sadece PDF kabul edilir.",
        )

    content = await file.read()

    # Validate file size
    if len(content) > settings.max_pdf_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Dosya çok büyük. Maksimum boyut: {settings.max_pdf_size_mb}MB",
        )

    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as exc:
        logger.warning("PDF okunamadı: %s", exc)
        raise HTTPException(
            status_code=400,
            detail="PDF dosyası okunamadı. Lütfen geçerli bir PDF dosyası yükleyin.",
        )

    text_parts: list[str] = []
    for page in reader.pages:
        extracted = page.extract_text() or ""
        if extracted.strip():
            text_parts.append(extracted)

    text = "\n\n".join(text_parts).strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="PDF dosyasından metin çıkarılamadı. Dosya görüntü tabanlı olabilir.",
        )

    word_count = len(text.split())
    char_count = len(text)

    logger.info(
        "PDF extracted: pages=%d, words=%d, chars=%d",
        len(reader.pages),
        word_count,
        char_count,
    )

    return PDFExtractResponse(
        text=text,
        pages=len(reader.pages),
        word_count=word_count,
        char_count=char_count,
        estimated_read_minutes=max(1, round(word_count / 200)),
        estimated_read_hours=round(word_count / 12000, 2),
    )
