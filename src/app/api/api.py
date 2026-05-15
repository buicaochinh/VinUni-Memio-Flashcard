from fastapi import APIRouter
from src.app.api.endpoints import admin, auth, decks, cards, users
from src.app.api.endpoints import integrations
from src.app.api.endpoints import integrations_telegram
from src.app.api.endpoints import ingestion
from src.app.api.endpoints import notion
from src.app.api.endpoints import games
from src.app.api.endpoints import coach
from src.app.api.endpoints import goals
from src.app.api.endpoints import notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(decks.router, prefix="/decks", tags=["Decks"])
api_router.include_router(cards.router, prefix="/cards", tags=["Cards"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(integrations_telegram.router, prefix="/integrations", tags=["Integrations"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["Ingestion"])
api_router.include_router(notion.router, prefix="/notion", tags=["Notion"])
api_router.include_router(games.router, prefix="/games", tags=["Games"])
api_router.include_router(coach.router, prefix="/coach", tags=["Coach"])
api_router.include_router(goals.router, prefix="/goals", tags=["Learning Goals"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
