from __future__ import annotations

import io
from typing import BinaryIO
from pypdf import PdfReader


class PdfExtractionError(Exception):
    pass


def _extract_from_reader(reader: PdfReader) -> dict:
    pages: list[dict] = []
    full_text_parts: list[str] = []

    for index, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        pages.append({"page": index, "text_length": len(text)})
        if text.strip():
            full_text_parts.append(f"\n\n--- SAYFA {index} ---\n{text}")

    full_text = "".join(full_text_parts).strip()
    return {
        "page_count": len(reader.pages),
        "text": full_text,
        "text_length": len(full_text),
        "pages": pages,
        "needs_ocr": len(full_text.strip()) < 30,
    }


def extract_text_from_pdf_stream(stream: BinaryIO) -> dict:
    """PDF metnini dosya-benzeri stream üzerinden çıkarır.

    Sabit MB limiti yoktur. Gerçek sınır, çalıştığı sunucunun RAM/disk/zaman
    kaynaklarına bağlıdır. Büyük PDF'lerde endpoint timeout almamak için sonraki
    fazda job queue/background worker eklenecektir.
    """
    try:
        if hasattr(stream, "seek"):
            stream.seek(0)
        reader = PdfReader(stream)
    except Exception as exc:
        raise PdfExtractionError("PDF okunamadı veya bozuk görünüyor.") from exc
    return _extract_from_reader(reader)


def extract_text_from_pdf_bytes(data: bytes) -> dict:
    if not data:
        raise PdfExtractionError("PDF dosyası boş görünüyor.")
    return extract_text_from_pdf_stream(io.BytesIO(data))
