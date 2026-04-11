from fastapi import APIRouter
from pydantic import BaseModel

from src import database as db

router = APIRouter()


class DeckCreate(BaseModel):
    user_id: int
    name: str


@router.get("/")
def get_decks(user_id: int):
    decks = db.get_user_decks(user_id)
    return {"decks": decks}


@router.post("/")
def create_deck(payload: DeckCreate):
    deck_id = db.create_deck(payload.user_id, payload.name)
    return {"message": "Success", "deck_id": deck_id}
