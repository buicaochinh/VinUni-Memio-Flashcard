import secrets
from sqlmodel import Session, select
from src.app.models.domain import (
    Deck,
    ExternalNote,
    Flashcard,
    IngestionCardMap,
    IngestionCursor,
    IngestionItem,
    IngestionRun,
    IngestionSource,
    Progress,
    StudySession,
)

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
    source_rows = session.exec(select(IngestionSource).where(IngestionSource.target_deck_id == deck_id)).all()
    source_ids = [row.id for row in source_rows if row.id is not None]

    if source_ids:
        item_rows = session.exec(select(IngestionItem).where(IngestionItem.source_id.in_(source_ids))).all()
        item_ids = [row.id for row in item_rows if row.id is not None]
        if item_ids:
            map_rows = session.exec(select(IngestionCardMap).where(IngestionCardMap.ingestion_item_id.in_(item_ids))).all()
            for row in map_rows:
                session.delete(row)

        run_rows = session.exec(select(IngestionRun).where(IngestionRun.source_id.in_(source_ids))).all()
        for row in run_rows:
            session.delete(row)

        note_rows = session.exec(select(ExternalNote).where(ExternalNote.source_id.in_(source_ids))).all()
        for row in note_rows:
            session.delete(row)

        cursor_rows = session.exec(select(IngestionCursor).where(IngestionCursor.source_id.in_(source_ids))).all()
        for row in cursor_rows:
            session.delete(row)

        for row in item_rows:
            session.delete(row)

        for row in source_rows:
            session.delete(row)

    study_rows = session.exec(select(StudySession).where(StudySession.deck_id == deck_id)).all()
    for row in study_rows:
        session.delete(row)

    cards_statement = select(Flashcard).where(Flashcard.deck_id == deck_id)
    cards = session.exec(cards_statement).all()
    for card in cards:
        progress_rows = session.exec(select(Progress).where(Progress.card_id == card.id)).all()
        for progress in progress_rows:
            session.delete(progress)
        session.delete(card)

    deck = session.get(Deck, deck_id)
    if deck:
        session.delete(deck)
    session.commit()
