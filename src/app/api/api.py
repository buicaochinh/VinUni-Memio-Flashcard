from fastapi import APIRouter
from src.app.api.endpoints import auth, decks, cards

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(decks.router, prefix="/decks", tags=["Decks"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])
