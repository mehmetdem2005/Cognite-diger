from __future__ import annotations

import os
import httpx

GROQ_BASE = "https://api.groq.com/openai/v1"


async def groq_chat(messages: list[dict], model: str = "llama-3.1-8b-instant") -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "Groq API anahtarı tanımlı değil. .env içine GROQ_API_KEY ekleyin."

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{GROQ_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={"model": model, "messages": messages, "temperature": 0.2},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
