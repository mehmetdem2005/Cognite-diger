from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import pypdf
import io
import os
import json
import re
import time
import asyncio
from typing import AsyncGenerator, Optional
from dotenv import load_dotenv
from cachetools import TTLCache

load_dotenv()

# ── Settings ──────────────────────────────────────────────────────────────────
class Settings(BaseSettings):
    groq_api_key: str = ""
    port: int = 8000
    environment: str = "production"
    max_pdf_size_mb: int = 50
    cache_ttl_seconds: int = 300

settings = Settings()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cognita API",
    version="5.0.0",
    description="Cognita v5.0 — Sosyal okuma platformu için AI destekli API",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-process cache ───────────────────────────────────────────────────────────
_analysis_cache: TTLCache = TTLCache(maxsize=100, ttl=settings.cache_ttl_seconds)

# ── Groq client ───────────────────────────────────────────────────────────────
try:
    from groq import Groq, AsyncGroq
    groq_client = Groq(api_key=settings.groq_api_key)
    async_groq_client = AsyncGroq(api_key=settings.groq_api_key)
except Exception as e:
    print(f"Groq init hatası: {e}")
    groq_client = None
    async_groq_client = None

# ── Model seçenekleri ──────────────────────────────────────────────────────────
MODELS = {
    "fast": "llama-3.1-8b-instant",
    "quality": "llama-3.3-70b-versatile",
    "balanced": "llama-3.1-70b-versatile",
    "compound": "compound-beta",
}

# ── Pydantic request modelleri ─────────────────────────────────────────────────
class FlashcardRequest(BaseModel):
    text: str = Field(..., min_length=10)
    book_title: str = ""
    count: int = Field(default=5, ge=3, le=15)
    model: str = Field(default="fast")

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=10)
    book_title: str = ""
    model: str = Field(default="quality")

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    book_content: str = ""
    book_title: str = ""
    model: str = Field(default="fast")
    stream: bool = False

class WritingAssistantRequest(BaseModel):
    message: str = Field(..., min_length=1)
    genre: str = ""
    model: str = Field(default="quality")

class QuizRequest(BaseModel):
    text: str = Field(..., min_length=50)
    book_title: str = ""
    question_count: int = Field(default=5, ge=3, le=10)
    difficulty: str = Field(default="orta")  # kolay / orta / zor
    model: str = Field(default="quality")

class VocabularyRequest(BaseModel):
    text: str = Field(..., min_length=10)
    language: str = Field(default="tr")
    count: int = Field(default=10, ge=5, le=20)

class SummaryRequest(BaseModel):
    text: str = Field(..., min_length=100)
    book_title: str = ""
    length: str = Field(default="orta")  # kısa / orta / uzun
    model: str = Field(default="quality")

# ── Utility ───────────────────────────────────────────────────────────────────
def _get_model(model_key: str) -> str:
    return MODELS.get(model_key, MODELS["fast"])

def _parse_json_response(content: str) -> dict | list:
    cleaned = re.sub(r'```(?:json)?|```', '', content).strip()
    return json.loads(cleaned)

def _require_groq():
    if not groq_client:
        raise HTTPException(status_code=503, detail="Groq API bağlantısı kurulamadı. GROQ_API_KEY eksik.")

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def root():
    return {
        "status": "Cognita API çalışıyor",
        "version": "5.0.0",
        "models": list(MODELS.keys()),
        "features": ["pdf-extract", "flashcards", "analyze", "chat", "chat-stream",
                     "writing-assistant", "quiz", "vocabulary", "summary"],
    }

@app.get("/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "groq": groq_client is not None,
        "version": "5.0.0",
        "timestamp": int(time.time()),
    }

# ── PDF ───────────────────────────────────────────────────────────────────────

@app.post("/api/pdf/extract", tags=["pdf"])
async def extract_pdf(file: UploadFile = File(...)):
    """PDF dosyasından metin, sayfa sayısı ve okuma süresi çıkarır."""
    if file.size and file.size > settings.max_pdf_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"PDF boyutu {settings.max_pdf_size_mb}MB sınırını aşıyor.")
    try:
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        pages_text = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                pages_text.append(extracted.strip())

        full_text = "\n\n".join(pages_text)
        word_count = len(full_text.split())
        char_count = len(full_text)

        return {
            "text": full_text,
            "pages": len(reader.pages),
            "word_count": word_count,
            "char_count": char_count,
            "estimated_read_minutes": round(word_count / 200),
            "estimated_read_hours": round(word_count / 12000, 1),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF işlenirken hata: {str(e)}")

# ── AI: Flashcards ─────────────────────────────────────────────────────────────

@app.post("/api/ai/flashcards", tags=["ai"])
async def generate_flashcards(req: FlashcardRequest):
    """Kitap metninden akıllı flashcard'lar üretir."""
    _require_groq()
    cache_key = f"flash:{hash(req.text[:500])}:{req.count}"
    if cache_key in _analysis_cache:
        return _analysis_cache[cache_key]

    try:
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[{
                "role": "user",
                "content": (
                    f'"{req.book_title}" kitabından {req.count} adet eğitici flashcard oluştur. '
                    f'Her kart önemli bir kavram, karakter, tema veya olay içermeli. '
                    f'SADECE JSON array döndür: [{{"question":"...","answer":"...","category":"kavram|karakter|tema|olay"}}]\n'
                    f'Metin: {req.text[:3000]}'
                )
            }],
            max_tokens=1500,
            temperature=0.7,
        )
        result = {"cards": _parse_json_response(completion.choices[0].message.content)}
        _analysis_cache[cache_key] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Analiz ─────────────────────────────────────────────────────────────────

@app.post("/api/ai/analyze", tags=["ai"])
async def analyze_book(req: AnalyzeRequest):
    """Kitap içeriğini derinlemesine analiz eder."""
    _require_groq()
    cache_key = f"analyze:{hash(req.text[:500])}"
    if cache_key in _analysis_cache:
        return _analysis_cache[cache_key]

    try:
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[{
                "role": "user",
                "content": (
                    f'"{req.book_title}" kitabını kapsamlı şekilde analiz et. '
                    f'SADECE JSON döndür:\n'
                    f'{{"summary":"...","themes":["..."],"concepts":["..."],"characters":["..."],'
                    f'"mood":"...","difficulty":"Kolay|Orta|Zor","target_audience":"...",'
                    f'"genre":"...","time_period":"...","key_quotes":["..."]}}\n'
                    f'Metin: {req.text[:4000]}'
                )
            }],
            max_tokens=1200,
            temperature=0.4,
        )
        result = _parse_json_response(completion.choices[0].message.content)
        _analysis_cache[cache_key] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Chat (normal) ──────────────────────────────────────────────────────────

@app.post("/api/ai/chat", tags=["ai"])
async def chat_with_book(req: ChatRequest):
    """Kitap hakkında soru-cevap yapar. stream=true ise SSE akışı döner."""
    _require_groq()
    if req.stream:
        return await _stream_chat(req)

    try:
        context = req.book_content[:5000] if req.book_content else ""
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[
                {
                    "role": "system",
                    "content": (
                        f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. '
                        f'{"Kitap içeriği: " + context if context else "Genel bilginle"} Türkçe, kısa ve net cevap ver.'
                    ),
                },
                {"role": "user", "content": req.message},
            ],
            max_tokens=700,
            temperature=0.7,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Chat Stream (SSE) ──────────────────────────────────────────────────────

async def _stream_chat(req: ChatRequest):
    """Server-Sent Events ile gerçek zamanlı AI yanıtı."""
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            context = req.book_content[:5000] if req.book_content else ""
            stream = await async_groq_client.chat.completions.create(
                model=_get_model(req.model),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. '
                            f'{"Kitap içeriği: " + context if context else "Genel bilginle"} Türkçe cevap ver.'
                        ),
                    },
                    {"role": "user", "content": req.message},
                ],
                max_tokens=700,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield f"data: {json.dumps({'token': delta})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.post("/api/ai/chat/stream", tags=["ai"])
async def chat_stream(req: ChatRequest):
    """Streaming-only chat endpoint (SSE)."""
    _require_groq()
    return await _stream_chat(req)

# ── AI: Writing Assistant ──────────────────────────────────────────────────────

@app.post("/api/ai/writing-assistant", tags=["ai"])
async def writing_assistant(req: WritingAssistantRequest):
    """Yazarlık koçu — yapıcı geri bildirim ve öneriler."""
    _require_groq()
    try:
        genre_context = f" ({req.genre} türünde)" if req.genre else ""
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Sen profesyonel bir Türk edebiyatçı ve yazarlık koçusun{genre_context}. "
                        "Yapıcı, motive edici, somut ve ayrıntılı Türkçe geri bildirim ver. "
                        "Güçlü yönleri ve geliştirilebilecek alanları dengeli şekilde paylaş."
                    ),
                },
                {"role": "user", "content": req.message},
            ],
            max_tokens=1000,
            temperature=0.75,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Quiz ──────────────────────────────────────────────────────────────────

@app.post("/api/ai/quiz", tags=["ai"])
async def generate_quiz(req: QuizRequest):
    """Okuma anlama testi soruları üretir (çoktan seçmeli)."""
    _require_groq()
    cache_key = f"quiz:{hash(req.text[:500])}:{req.question_count}:{req.difficulty}"
    if cache_key in _analysis_cache:
        return _analysis_cache[cache_key]

    try:
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[{
                "role": "user",
                "content": (
                    f'"{req.book_title}" kitabından {req.difficulty} seviyede '
                    f'{req.question_count} adet çoktan seçmeli okuma anlama sorusu oluştur. '
                    f'SADECE JSON array döndür:\n'
                    f'[{{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],'
                    f'"correct":"A","explanation":"..."}}]\n'
                    f'Metin: {req.text[:4000]}'
                )
            }],
            max_tokens=2000,
            temperature=0.6,
        )
        result = {"questions": _parse_json_response(completion.choices[0].message.content)}
        _analysis_cache[cache_key] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Vocabulary ─────────────────────────────────────────────────────────────

@app.post("/api/ai/vocabulary", tags=["ai"])
async def extract_vocabulary(req: VocabularyRequest):
    """Metinden öğrenilmesi gereken kelimeleri ve anlamlarını çıkarır."""
    _require_groq()
    try:
        completion = groq_client.chat.completions.create(
            model=_get_model("fast"),
            messages=[{
                "role": "user",
                "content": (
                    f'Bu metinden öğrenilmesi gereken {req.count} kelime çıkar. '
                    f'SADECE JSON array döndür:\n'
                    f'[{{"word":"...","meaning":"...","example":"...","level":"temel|orta|ileri"}}]\n'
                    f'Metin: {req.text[:2000]}'
                )
            }],
            max_tokens=1500,
            temperature=0.5,
        )
        return {"vocabulary": _parse_json_response(completion.choices[0].message.content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Summary ────────────────────────────────────────────────────────────────

@app.post("/api/ai/summary", tags=["ai"])
async def summarize_book(req: SummaryRequest):
    """Kitabın bölüm/kısa/orta/uzun özetini çıkarır."""
    _require_groq()
    cache_key = f"summary:{hash(req.text[:500])}:{req.length}"
    if cache_key in _analysis_cache:
        return _analysis_cache[cache_key]

    length_map = {"kısa": 150, "orta": 350, "uzun": 600}
    max_tokens = length_map.get(req.length, 350)

    try:
        completion = groq_client.chat.completions.create(
            model=_get_model(req.model),
            messages=[
                {
                    "role": "system",
                    "content": "Sen kısa ve öz özetler yazan bir editörsün. Türkçe yaz.",
                },
                {
                    "role": "user",
                    "content": (
                        f'"{req.book_title}" kitabının {req.length} bir özetini yaz.\n'
                        f'Metin: {req.text[:5000]}'
                    ),
                },
            ],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        result = {
            "summary": completion.choices[0].message.content,
            "length": req.length,
            "word_count": len(completion.choices[0].message.content.split()),
        }
        _analysis_cache[cache_key] = result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── AI: Recommendations ────────────────────────────────────────────────────────

@app.post("/api/ai/recommend", tags=["ai"])
async def recommend_books(request: dict):
    """Okunan kitaplara göre benzer kitap önerileri üretir."""
    _require_groq()
    try:
        read_books = request.get("read_books", [])
        preferred_genres = request.get("preferred_genres", [])
        completion = groq_client.chat.completions.create(
            model=_get_model("quality"),
            messages=[{
                "role": "user",
                "content": (
                    f'Kullanıcının okuduğu kitaplar: {", ".join(read_books[:10])}. '
                    f'Sevdiği türler: {", ".join(preferred_genres)}. '
                    f'Bu kullanıcıya 5 kitap öner. '
                    f'SADECE JSON array döndür: '
                    f'[{{"title":"...","author":"...","reason":"...","genre":"...","difficulty":"Kolay|Orta|Zor"}}]'
                )
            }],
            max_tokens=800,
            temperature=0.8,
        )
        return {"recommendations": _parse_json_response(completion.choices[0].message.content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment != "production",
        workers=1 if settings.environment != "production" else 4,
    )
