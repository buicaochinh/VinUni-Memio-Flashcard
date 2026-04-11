from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src import database as db

router = APIRouter()


class DeckCreate(BaseModel):
    user_id: int
    name: str
    description: str = ""


class DeckShareUpdate(BaseModel):
    is_public: bool


@router.get("/")
def get_decks(user_id: int):
    decks = db.get_user_decks(user_id)
    return {"decks": decks}


@router.post("/")
def create_deck(payload: DeckCreate):
    deck_id = db.create_deck(payload.user_id, payload.name, payload.description)
    return {"message": "success", "deck_id": deck_id}


@router.delete("/{deck_id}")
def remove_deck(deck_id: int):
    db.delete_deck(deck_id)
    return {"message": "success"}


# Enable sharing → returns unique share token
@router.post("/{deck_id}/share")
def share_deck(deck_id: int):
    token = db.enable_deck_sharing(deck_id)
    return {"message": "success", "share_token": token}


# Disable sharing
@router.delete("/{deck_id}/share")
def unshare_deck(deck_id: int):
    db.disable_deck_sharing(deck_id)
    return {"message": "success"}


# Public endpoint: get shared deck info + cards (no auth required)
@router.get("/shared/{token}")
def get_shared_deck(token: str):
    deck = db.get_deck_by_share_token(token)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found or not public")
    cards = db.get_public_deck_cards(deck["id"])
    return {"deck": deck, "cards": cards}


# Analytics endpoint
@router.get("/analytics")
def get_analytics(user_id: int):
    data = db.get_analytics(user_id)
    return data
