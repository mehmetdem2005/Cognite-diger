from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import PyPDF2
import io
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Cognita API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
except Exception as e:
    print(f"Groq init error: {e}")
    groq_client = None

@app.get("/")
def root():
    return {"status": "Cognita API çalışıyor", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/pdf/extract")
async def extract_pdf(file: UploadFile = File(...)):
    try:
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n\n"
        word_count = len(text.split())
        return {
            "text": text.strip(),
            "pages": len(pdf_reader.pages),
            "word_count": word_count,
            "estimated_read_minutes": round(word_count / 200)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/flashcards")
async def generate_flashcards(request: dict):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    try:
        text = request.get("text", "")
        book_title = request.get("book_title", "")
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{
                "role": "user",
                "content": f'"{book_title}" kitabından 5 flashcard oluştur. SADECE JSON array döndür: [{{"question":"...","answer":"..."}}]\nMetin: {text[:3000]}'
            }],
            max_tokens=1000,
            temperature=0.7,
        )
        content = completion.choices[0].message.content
        content = re.sub(r'```json|```', '', content).strip()
        cards = json.loads(content)
        return {"cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/analyze")
async def analyze_book(request: dict):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    try:
        text = request.get("text", "")
        book_title = request.get("book_title", "")
        completion = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{
                "role": "user",
                "content": f'"{book_title}" kitabını analiz et. SADECE JSON döndür: {{"summary":"...","themes":["..."],"concepts":["..."],"mood":"...","difficulty":"Kolay/Orta/Zor","target_audience":"..."}}\nMetin: {text[:4000]}'
            }],
            max_tokens=800,
            temperature=0.5,
        )
        content = completion.choices[0].message.content
        content = re.sub(r'```json|```', '', content).strip()
        return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/chat")
async def chat_with_book(request: dict):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    try:
        message = request.get("message", "")
        book_content = request.get("book_content", "")
        book_title = request.get("book_title", "")
        completion = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": f'Sen "{book_title}" kitabı hakkında uzman bir asistansın. Sadece bu kitaba dayanarak Türkçe cevap ver. Kitap içeriği: {book_content[:5000]}'
                },
                {"role": "user", "content": message}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/writing-assistant")
async def writing_assistant(request: dict):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key eksik")
    try:
        message = request.get("message", "")
        completion = groq_client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "Sen profesyonel bir Türk edebiyatçı ve yazarlık koçusun. Yapıcı, motive edici ve detaylı Türkçe cevap ver."
                },
                {"role": "user", "content": message}
            ],
            max_tokens=800,
            temperature=0.7,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
