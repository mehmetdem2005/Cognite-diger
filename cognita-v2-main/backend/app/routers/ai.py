from __future__ import annotations

import json
import logging

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_cache_service, get_groq_service
from app.models.schemas import (
    AnalyzeRequest,
    ChatRequest,
    ChatResponse,
    FlashcardRequest,
    QuizRequest,
    RecommendRequest,
    SummaryRequest,
    VocabularyRequest,
    WritingAssistantRequest,
    WritingAssistantResponse,
)
from app.services.cache_service import CacheService
from app.services.groq_service import GroqService

logger = logging.getLogger("cognita.ai")

router = APIRouter(prefix="/api/ai", tags=["AI"])


# ── Helpers ─────────────────────────────────────────────────────────


def _groq() -> GroqService:
    return get_groq_service()


def _cache() -> CacheService:
    return get_cache_service()


# ── Flashcards ──────────────────────────────────────────────────────


@router.post("/flashcards", summary="AI flashcard üret")
async def flashcards(req: FlashcardRequest):
    cache = _cache()
    key = cache.make_key("flashcards", req.model_dump_json())
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
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
        model=req.model,
        max_tokens=1200,
        temperature=0.5,
    )
    out = {"cards": result}
    cache.set(key, out)
    return out


# ── Analyze ─────────────────────────────────────────────────────────


@router.post("/analyze", summary="Kitap metni analiz et")
async def analyze(req: AnalyzeRequest):
    cache = _cache()
    key = cache.make_key("analyze", req.model_dump_json())
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
        messages=[
            {
                "role": "system",
                "content": (
                    "SADECE JSON döndür. Alanlar: summary, themes, concepts, "
                    "mood, difficulty, target_audience, characters, key_quotes"
                ),
            },
            {
                "role": "user",
                "content": f'"{req.book_title}" kitabını analiz et. Metin:\n{req.text[:7000]}',
            },
        ],
        model=req.model,
        max_tokens=1400,
        temperature=0.4,
    )
    cache.set(key, result)
    return result


# ── Chat ────────────────────────────────────────────────────────────


async def _stream_chat(req: ChatRequest):
    groq = _groq()
    context = req.book_content[:6000]

    async def event_generator():
        stream = await groq.stream_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. '
                        f"Türkçe kısa ve net cevap ver. Bağlam: {context}"
                    ),
                },
                {"role": "user", "content": req.message},
            ],
            model=req.model,
            max_tokens=900,
            temperature=0.6,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield {"data": json.dumps({"token": delta}, ensure_ascii=False)}
        yield {"data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.post("/chat", summary="Kitap hakkında sohbet")
async def chat(req: ChatRequest):
    if req.stream:
        return await _stream_chat(req)

    groq = _groq()
    completion = await groq.chat_completion(
        messages=[
            {
                "role": "system",
                "content": (
                    f'Sen "{req.book_title}" kitabı hakkında uzman bir asistansın. '
                    f"Türkçe kısa ve net cevap ver. Bağlam: {req.book_content[:6000]}"
                ),
            },
            {"role": "user", "content": req.message},
        ],
        model=req.model,
        max_tokens=900,
        temperature=0.6,
    )
    return ChatResponse(response=completion.choices[0].message.content)


@router.post("/chat/stream", summary="Kitap sohbet (streaming)")
async def chat_stream(req: ChatRequest):
    return await _stream_chat(req)


# ── Writing Assistant ───────────────────────────────────────────────


@router.post("/writing-assistant", summary="Yazarlık asistanı")
async def writing_assistant(req: WritingAssistantRequest):
    groq = _groq()
    completion = await groq.chat_completion(
        messages=[
            {
                "role": "system",
                "content": f"Sen profesyonel bir yazarlık koçusun. Tür: {req.genre or 'genel'}",
            },
            {"role": "user", "content": req.message},
        ],
        model=req.model,
        max_tokens=1000,
        temperature=0.7,
    )
    return WritingAssistantResponse(response=completion.choices[0].message.content)


# ── Quiz ────────────────────────────────────────────────────────────


@router.post("/quiz", summary="Quiz soruları üret")
async def quiz(req: QuizRequest):
    cache = _cache()
    key = cache.make_key("quiz", req.model_dump_json())
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {questions:[{question, options:[...], answer, explanation}]}",
            },
            {
                "role": "user",
                "content": (
                    f'"{req.book_title}" için zorluk={req.difficulty} '
                    f"olacak şekilde {req.question_count} soru üret. Metin: {req.text[:7000]}"
                ),
            },
        ],
        model=req.model,
        max_tokens=1800,
        temperature=0.5,
    )
    cache.set(key, result)
    return result


# ── Vocabulary ──────────────────────────────────────────────────────


@router.post("/vocabulary", summary="Kelime çıkar")
async def vocabulary(req: VocabularyRequest):
    cache = _cache()
    key = cache.make_key("vocabulary", req.model_dump_json())
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {words:[{word, meaning, example, level}]}",
            },
            {
                "role": "user",
                "content": (
                    f"{req.language} dilinde metinden {req.count} kelime çıkar. "
                    f"Metin: {req.text[:7000]}"
                ),
            },
        ],
        model=req.model,
        max_tokens=1400,
        temperature=0.3,
    )
    cache.set(key, result)
    return result


# ── Summary ─────────────────────────────────────────────────────────


@router.post("/summary", summary="Kitap özeti üret")
async def summary(req: SummaryRequest):
    cache = _cache()
    key = cache.make_key("summary", req.model_dump_json())
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
        messages=[
            {
                "role": "system",
                "content": "SADECE JSON döndür. Şema: {summary, bullets:[...], takeaways:[...]}",
            },
            {
                "role": "user",
                "content": (
                    f'"{req.book_title}" için uzunluk={req.length} özet üret. '
                    f"Metin: {req.text[:10000]}"
                ),
            },
        ],
        model=req.model,
        max_tokens=1500,
        temperature=0.4,
    )
    cache.set(key, result)
    return result


# ── Recommend ───────────────────────────────────────────────────────


@router.post("/recommend", summary="Kitap önerileri")
async def recommend(req: RecommendRequest):
    cache = _cache()
    payload = req.model_dump_json()
    key = cache.make_key("recommend", payload)
    cached = cache.get(key)
    if cached is not None:
        return cached

    result = await _groq().ask_json(
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
        model=req.model,
        max_tokens=1400,
        temperature=0.6,
    )
    cache.set(key, result)
    return result
