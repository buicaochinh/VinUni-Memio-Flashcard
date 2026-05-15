from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.services import deck_service, card_service, analytics_service, evaluation_service
from src.app.schemas.deck import DeckCreate

router = APIRouter()

@router.get("/")
def get_decks(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    decks = deck_service.get_user_decks(session, user_id)
    return {"decks": decks}

@router.post("/")
def create_deck(payload: DeckCreate, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    deck_id = deck_service.create_deck(session, user_id, payload.name, payload.description)
    return {"message": "success", "deck_id": deck_id}

@router.put("/{deck_id}")
def update_deck(deck_id: int, payload: DeckCreate, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    ok = deck_service.update_deck(session, deck_id, user_id, payload.name, payload.description or "")
    if not ok:
        raise HTTPException(status_code=404, detail="Deck not found")
    return {"message": "success"}

@router.delete("/{deck_id}")
def remove_deck(deck_id: int, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    deck_service.delete_deck(session, deck_id, user_id)
    return {"message": "success"}

@router.post("/{deck_id}/share")
def share_deck(deck_id: int, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    token = deck_service.enable_deck_sharing(session, deck_id, user_id)
    return {"message": "success", "share_token": token}

@router.delete("/{deck_id}/share")
def unshare_deck(deck_id: int, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    deck_service.disable_deck_sharing(session, deck_id, user_id)
    return {"message": "success"}

# Public endpoint: get shared deck info + cards (no auth required)
@router.get("/shared/{token}")
def get_shared_deck(token: str, session: Session = Depends(get_session)):
    deck = deck_service.get_deck_by_share_token(session, token)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found or not public")
    cards = card_service.get_public_deck_cards(session, deck["id"])
    return {"deck": deck, "cards": cards}

@router.get("/analytics")
def get_analytics(user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    data = analytics_service.get_analytics(session, user_id)
    return data


@router.get("/evaluation/pilot")
def get_pilot_evaluation(
    days: int = 7,
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    return evaluation_service.get_pilot_evaluation(session, days=max(7, min(days, 30)))
