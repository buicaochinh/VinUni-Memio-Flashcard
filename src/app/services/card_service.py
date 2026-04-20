import datetime
from sqlmodel import Session, select
from src.app.models.domain import Flashcard, Progress, StudySession

def add_flashcard(session: Session, deck_id: int, front: str, back: str, difficulty: str = "medium"):
    card = Flashcard(deck_id=deck_id, front=front, back=back, difficulty=difficulty)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card.id


def bulk_add_flashcards(session: Session, deck_id: int, cards: list[dict]):
    """cards: list of dicts with front, back, difficulty keys"""
    for card_data in cards:
        card = Flashcard(
            deck_id=deck_id,
            front=card_data["front"],
            back=card_data["back"],
            difficulty=card_data.get("difficulty", "medium")
        )
        session.add(card)
    session.commit()


def update_flashcard(session: Session, card_id: int, front: str, back: str, difficulty: str = None):
    card = session.get(Flashcard, card_id)
    if card:
        card.front = front
        card.back = back
        if difficulty:
            card.difficulty = difficulty
        session.add(card)
        session.commit()


def delete_flashcard(session: Session, card_id: int):
    # Delete progress first
    progress_statement = select(Progress).where(Progress.card_id == card_id)
    progresses = session.exec(progress_statement).all()
    for p in progresses:
        session.delete(p)
        
    card = session.get(Flashcard, card_id)
    if card:
        session.delete(card)
    session.commit()


def get_deck_cards(session: Session, deck_id: int, user_id: int):
    statement = (
        select(Flashcard, Progress)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Flashcard.deck_id == deck_id)
        .order_by(Flashcard.created_at.asc())
    )
    results = session.exec(statement).all()
    
    cards = []
    for f, p in results:
        d = f.model_dump()
        if p:
            p_data = p.model_dump(exclude={"id", "user_id", "card_id"})
            d.update(p_data)
        cards.append(d)
    return cards


def get_public_deck_cards(session: Session, deck_id: int):
    statement = select(Flashcard).where(Flashcard.deck_id == deck_id).order_by(Flashcard.created_at.asc())
    cards = session.exec(statement).all()
    return [c.model_dump() for c in cards]


def update_card_progress(session: Session, user_id: int, card_id: int, interval: int, repetition: int, ease_factor: float, quality: int = -1):
    statement = select(Progress).where(Progress.user_id == user_id, Progress.card_id == card_id)
    progress = session.exec(statement).first()
    
    last_reviewed = datetime.datetime.now().strftime("%Y-%m-%d")
    next_review = (
        datetime.datetime.now() + datetime.timedelta(days=interval)
    ).strftime("%Y-%m-%d")

    if not progress:
        progress = Progress(
            user_id=user_id,
            card_id=card_id,
            interval=interval,
            repetition=repetition,
            ease_factor=ease_factor,
            last_quality=quality,
            last_reviewed=last_reviewed,
            next_review=next_review
        )
    else:
        progress.interval = interval
        progress.repetition = repetition
        progress.ease_factor = ease_factor
        progress.last_quality = quality
        progress.last_reviewed = last_reviewed
        progress.next_review = next_review
        
    session.add(progress)
    session.commit()


def log_study_session(session: Session, user_id: int, deck_id: int, cards_reviewed: int, avg_quality: float):
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    statement = select(StudySession).where(
        StudySession.user_id == user_id, 
        StudySession.deck_id == deck_id, 
        StudySession.session_date == today
    )
    session_log = session.exec(statement).first()
    
    if not session_log:
        session_log = StudySession(
            user_id=user_id,
            deck_id=deck_id,
            session_date=today,
            cards_reviewed=cards_reviewed,
            avg_quality=avg_quality
        )
    else:
        # Weighted average: ((old_avg * old_count) + (session_avg * session_count)) / (old_count + session_count)
        total_old_quality = session_log.avg_quality * session_log.cards_reviewed
        total_session_quality = avg_quality * cards_reviewed
        new_total_cards = session_log.cards_reviewed + cards_reviewed
        
        session_log.cards_reviewed = new_total_cards
        session_log.avg_quality = (total_old_quality + total_session_quality) / new_total_cards
        
    session.add(session_log)
    session.commit()
