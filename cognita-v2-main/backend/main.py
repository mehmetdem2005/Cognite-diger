from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from cachetools import TTLCache
from pypdf import PdfReader
from groq import Groq, AsyncGroq
from sse_starlette.sse import EventSourceResponse
import hashlib
import io
import json
import os
import re

load_dotenv()


class Settings(BaseSettings):
    groq_api_key: str = ""
    port: int = 8000
    allowed_origins: str = "*"


settings = Settings()

MODELS = {
    "fast": "llama-3.1-8b-instant",
    "quality": "llama-3.3-70b-versatile",
    "balanced": "llama-3.1-70b-versatile",
    "compound": "compound-beta",
}

app = FastAPI(title="Cognita API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sync_groq = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
async_groq = AsyncGroq(api_key=settings.groq_api_key) if settings.groq_api_key else None
response_cache = TTLCache(maxsize=512, ttl=300)


class FlashcardRequest(BaseModel):
    text: str
    book_title: str = ""
    count: int = 5
    model: str = "fast"


class AnalyzeRequest(BaseModel):
    text: str
    book_title: str = ""
    model: str = "quality"


class ChatRequest(BaseModel):
    message: str
    book_content: str = ""
    book_title: str = ""
    model: str = "fast"
    stream: bool = False


class WritingAssistantRequest(BaseModel):
    message: str
    genre: str = ""
    model: str = "quality"


class QuizRequest(BaseModel):
    text: str
    book_title: str = ""
    question_count: int = 5
    difficulty: str = "orta"
    model: str = "quality"


class VocabularyRequest(BaseModel):
    text: str
    language: str = "tr"
    count: int = 10
    model: str = "quality"


class SummaryRequest(BaseModel):
    text: str
    book_title: str = ""
    length: str = "orta"
    model: str = "quality"


class RecommendRequest(BaseModel):
    books: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    model: str = "quality"


def ensure_groq() -> Groq:
    if not sync_groq:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    return sync_groq


def ensure_async_groq() -> AsyncGroq:
    if not async_groq:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    return async_groq


def resolve_model(name: str) -> str:
    return MODELS.get(name, MODELS["quality"])


def cache_key(prefix: str, payload: str) -> str:
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


def cleanup_json(content: str) -> str:
    return re.sub(r"```json|```", "", content or "").strip()


def ask_json(messages: list[dict], model: str, max_tokens: int = 1000, temperature: float = 0.4) -> dict | list:
    client = ensure_groq()
    completion = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = cleanup_json(completion.choices[0].message.content)
    return json.loads(content)


@app.get("/")
def root():
    return {
        "name": "Cognita API",
        "version": "5.0.0",
        "features": [
            "pdf_extract",
            "flashcards",
            "analyze",
            "chat_streaming",
            "writing_assistant",
            "quiz",
            "vocabulary",
            "summary",
            "recommend",
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "groq": bool(settings.groq_api_key),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/api/pdf/extract")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        reader = PdfReader(io.BytesIO(content))
        text_parts: list[str] = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            if extracted.strip():
                text_parts.append(extracted)
        text = "\n\n".join(text_parts).strip()
        word_count = len(text.split())
        char_count = len(text)
        return {
            "text": text,
            "pages": len(reader.pages),
            "word_count": word_count,
            "char_count": char_count,
            "estimated_read_minutes": round(word_count / 200),
            "estimated_read_hours": round(word_count / 12000, 2),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/ai/flashcards")
async def flashcards(req: FlashcardRequest):
    payload = req.model_dump_json()
    key = cache_key("flashcards", payload)
    if key in response_cache:
        return response_cache[key]

    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: [{question, answer, category}]",
            },
            {
                "role": "user",
                "content": f'"{req.book_title}" için {req.count} flashcard üret. Metin:\n{req.text[:5000]}',
            },
        ],
        model=model,
        max_tokens=1200,
        temperature=0.5,
    )
    out = {"cards": result}
    response_cache[key] = out
    return out


@app.post("/api/ai/analyze")
async def analyze(req: AnalyzeRequest):
    payload = req.model_dump_json()
    key = cache_key("analyze", payload)
    if key in response_cache:
        return response_cache[key]

    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Alanlar: summary, themes, concepts, mood, difficulty, target_audience, characters, key_quotes",
            },
            {
                "role": "user",
                "content": f'"{req.book_title}" kitabını analiz et. Metin:\n{req.text[:7000]}',
            },
        ],
        model=model,
        max_tokens=1400,
        temperature=0.4,
    )
    response_cache[key] = result
    return result


async def _stream_chat(req: ChatRequest):
    async_client = ensure_async_groq()
    model = resolve_model(req.model)
    context = req.book_content[:6000]

    async def event_generator():
        stream = await async_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. Türkçe kısa ve net cevap ver. Bağlam: {context}',
                },
                {"role": "user", "content": req.message},
            ],
            stream=True,
            max_tokens=900,
            temperature=0.6,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield {"data": json.dumps({"token": delta}, ensure_ascii=False)}
        yield {"data": "[DONE]"}

    return EventSourceResponse(event_generator())


@app.post("/api/ai/chat")
async def chat(req: ChatRequest):
    if req.stream:
        return await _stream_chat(req)

    client = ensure_groq()
    model = resolve_model(req.model)
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. Türkçe kısa ve net cevap ver. Bağlam: {req.book_content[:6000]}',
            },
            {"role": "user", "content": req.message},
        ],
        max_tokens=900,
        temperature=0.6,
    )
    return {"response": completion.choices[0].message.content}


@app.post("/api/ai/chat/stream")
async def chat_stream(req: ChatRequest):
    return await _stream_chat(req)


@app.post("/api/ai/writing-assistant")
async def writing_assistant(req: WritingAssistantRequest):
    client = ensure_groq()
    model = resolve_model(req.model)
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": f"Sen profesyonel bir yazarlık koçusun. Tür: {req.genre or 'genel'}",
            },
            {"role": "user", "content": req.message},
        ],
        max_tokens=1000,
        temperature=0.7,
    )
    return {"response": completion.choices[0].message.content}


@app.post("/api/ai/quiz")
async def quiz(req: QuizRequest):
    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {questions:[{question, options:[...], answer, explanation}]}",
            },
            {
                "role": "user",
                "content": f'"{req.book_title}" için zorluk={req.difficulty} olacak şekilde {req.question_count} soru üret. Metin: {req.text[:7000]}',
            },
        ],
        model=model,
        max_tokens=1800,
        temperature=0.5,
    )
    return result


@app.post("/api/ai/vocabulary")
async def vocabulary(req: VocabularyRequest):
    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {words:[{word, meaning, example, level}]}",
            },
            {
                "role": "user",
                "content": f'{req.language} dilinde metinden {req.count} kelime çıkar. Metin: {req.text[:7000]}',
            },
        ],
        model=model,
        max_tokens=1400,
        temperature=0.3,
    )
    return result


@app.post("/api/ai/summary")
async def summary(req: SummaryRequest):
    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {summary, bullets:[...], takeaways:[...]}",
            },
            {
                "role": "user",
                "content": f'"{req.book_title}" için uzunluk={req.length} özet üret. Metin: {req.text[:10000]}',
            },
        ],
        model=model,
        max_tokens=1500,
        temperature=0.4,
    )
    return result


@app.post("/api/ai/recommend")
async def recommend(req: RecommendRequest):
    model = resolve_model(req.model)
    result = ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {recommendations:[{title, reason, genre}]}",
            },
            {
                "role": "user",
                "content": f"Okunanlar: {req.books}\nİlgiler: {req.interests}\nBuna uygun 10 öneri üret.",
            },
        ],
        model=model,
        max_tokens=1400,
        temperature=0.6,
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", settings.port)))
