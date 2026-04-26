from backend.database import init_db
import uvicorn


if __name__ == "__main__":
    init_db()
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
