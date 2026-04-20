from dotenv import load_dotenv

# Load .env before any module that reads env vars
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.app.db.session import init_db
from src.app.api.api import api_router

app = FastAPI(title="AI Flashcard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mem.io.vn",
        "https://api.mem.io.vn",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def read_root():
    return {"message": "Memio Backend is running!"}


# All API routes prefixed with /api
app.include_router(api_router, prefix="/api")
