from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env before any module that reads env vars
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.db.session import init_db
from src.app.api.api import api_router
from src.app.worker.scheduler import scheduler, setup_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    setup_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="AI Flashcard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://a20-app-001.mem.io.vn",
        "https://api.mem.io.vn",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Memio Backend is running!"}


@app.get("/health")
def health():
    return {"status": "ok"}


# All API routes prefixed with /api
app.include_router(api_router, prefix="/api")
