import secrets
from sqlmodel import Session, select
from src.app.models.domain import Deck, Flashcard

def create_deck(session: Session, user_id: int, name: str, description: str = ""):
    deck = Deck(user_id=user_id, name=name, description=description)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck.id


def get_user_decks(session: Session, user_id: int):
    statement = select(Deck).where(Deck.user_id == user_id).order_by(Deck.created_at.desc())
    decks = session.exec(statement).all()
    return [d.model_dump() for d in decks]


def get_deck_by_id(session: Session, deck_id: int):
    deck = session.get(Deck, deck_id)
    return deck.model_dump() if deck else None


def get_deck_by_share_token(session: Session, token: str):
    statement = select(Deck).where(Deck.share_token == token, Deck.is_public == 1)
    deck = session.exec(statement).first()
    return deck.model_dump() if deck else None


def enable_deck_sharing(session: Session, deck_id: int):
    token = secrets.token_urlsafe(8)
    deck = session.get(Deck, deck_id)
    if deck:
        deck.is_public = 1
        deck.share_token = token
        session.add(deck)
        session.commit()
        return token
    return None


def disable_deck_sharing(session: Session, deck_id: int):
    deck = session.get(Deck, deck_id)
    if deck:
        deck.is_public = 0
        session.add(deck)
        session.commit()


def delete_deck(session: Session, deck_id: int):
    # Delete flashcards first
    cards_statement = select(Flashcard).where(Flashcard.deck_id == deck_id)
    cards = session.exec(cards_statement).all()
    for card in cards:
        session.delete(card)

    deck = session.get(Deck, deck_id)
    if deck:
        session.delete(deck)
    session.commit()
