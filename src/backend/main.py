from dotenv import load_dotenv

# Load .env before any module that reads env vars (OpenAI, Anthropic, etc.)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import init_db
from src.backend.routers import auth, cards, decks

app = FastAPI(title="AI Flashcard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://friction-protozoan-sanctuary.ngrok-free.dev",
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
    return {"message": "AI Flashcard Backend is running!"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(decks.router, prefix="/api/decks", tags=["Decks"])
app.include_router(cards.router, prefix="/api/cards", tags=["Cards"])
