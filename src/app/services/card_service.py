from sqlmodel import Session, select
from src.app.core.time import add_days_to_date_key, local_date_key
from src.app.models.domain import Flashcard, Progress, StudySession
from src.app.services.timezone_service import get_user_timezone

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
            difficulty=card_data.get("difficulty", "medium"),
            source_context=card_data.get("source_context")
        )
        session.add(card)
    session.commit()


def replace_flashcards(session: Session, deck_id: int, card_ids: list[int], cards: list[dict]) -> list[int]:
    for card_id in card_ids:
        delete_flashcard(session, card_id)

    created_ids: list[int] = []
    for card_data in cards:
        card = Flashcard(
            deck_id=deck_id,
            front=card_data["front"],
            back=card_data["back"],
            difficulty=card_data.get("difficulty", "medium"),
            source_context=card_data.get("source_context"),
        )
        session.add(card)
        session.flush()
        if card.id is not None:
            created_ids.append(card.id)
    session.commit()
    return created_ids


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

    today = local_date_key(get_user_timezone(session, user_id))
    is_new = True
    already_reviewed_today = False

    if progress:
        if progress.repetition > 0:
            is_new = False
        if progress.last_reviewed == today:
            already_reviewed_today = True

    last_reviewed = today
    next_review = add_days_to_date_key(today, interval)

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

    if not already_reviewed_today:
        card = session.get(Flashcard, card_id)
        if card:
            session_statement = select(StudySession).where(
                StudySession.user_id == user_id,
                StudySession.deck_id == card.deck_id,
                StudySession.session_date == today
            )
            session_log = session.exec(session_statement).first()
            if not session_log:
                session_log = StudySession(
                    user_id=user_id, deck_id=card.deck_id, session_date=today,
                    cards_reviewed=0, avg_quality=0,
                    new_cards_reviewed=1 if is_new else 0,
                    review_cards_reviewed=0 if is_new else 1
                )
            else:
                if is_new:
                    session_log.new_cards_reviewed += 1
                else:
                    session_log.review_cards_reviewed += 1
            session.add(session_log)

    session.commit()


def log_study_session(session: Session, user_id: int, deck_id: int, cards_reviewed: int, avg_quality: float):
    today = local_date_key(get_user_timezone(session, user_id))
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

from src.app.models.domain import UserSettings

def get_daily_study_queue(session: Session, deck_id: int, user_id: int, override_limit: bool = False):
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    daily_new_limit = settings.daily_new_limit if settings else 20
    daily_review_limit = settings.daily_review_limit if settings else 50

    today = local_date_key(get_user_timezone(session, user_id))
    study_session = session.exec(select(StudySession).where(
        StudySession.user_id == user_id,
        StudySession.deck_id == deck_id,
        StudySession.session_date == today
    )).first()

    new_reviewed = study_session.new_cards_reviewed if study_session else 0
    review_reviewed = study_session.review_cards_reviewed if study_session else 0

    if override_limit:
        rem_new = 20
        rem_review = 50
    else:
        rem_new = max(0, daily_new_limit - new_reviewed)
        rem_review = max(0, daily_review_limit - review_reviewed)

    statement = (
        select(Flashcard, Progress)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Flashcard.deck_id == deck_id)
        .order_by(Flashcard.created_at.asc())
    )
    results = session.exec(statement).all()

    review_cards = []
    new_cards = []
    ahead_cards = [] # Cards due in the future

    for f, p in results:
        d = f.model_dump()
        if p:
            p_data = p.model_dump(exclude={"id", "user_id", "card_id"})
            d.update(p_data)

            # Check if it was already reviewed today
            if p.last_reviewed == today:
                continue # Skip cards already answered today

            if p.repetition > 0:
                if (p.next_review is None or p.next_review <= today):
                    review_cards.append(d)
                else:
                    ahead_cards.append(d)
            elif p.repetition == 0:
                new_cards.append(d)
        else:
            new_cards.append(d)

    # Sort ahead cards by next_review (earliest first)
    ahead_cards.sort(key=lambda x: x.get("next_review") or "")

    review_queue = review_cards[:rem_review]

    # If overriding and we still have capacity in review_queue, pull from ahead_cards
    if override_limit and len(review_queue) < rem_review:
        needed = rem_review - len(review_queue)
        review_queue += ahead_cards[:needed]

    new_queue = new_cards[:rem_new]

    return review_queue + new_queue

def get_study_summary(session: Session, deck_id: int, user_id: int):
    settings = session.exec(select(UserSettings).where(UserSettings.user_id == user_id)).first()
    daily_new_limit = settings.daily_new_limit if settings else 20
    daily_review_limit = settings.daily_review_limit if settings else 50

    today = local_date_key(get_user_timezone(session, user_id))
    study_session = session.exec(select(StudySession).where(
        StudySession.user_id == user_id,
        StudySession.deck_id == deck_id,
        StudySession.session_date == today
    )).first()

    new_reviewed = study_session.new_cards_reviewed if study_session else 0
    review_reviewed = study_session.review_cards_reviewed if study_session else 0

    statement = (
        select(Flashcard, Progress)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Flashcard.deck_id == deck_id)
    )
    results = session.exec(statement).all()

    due_cards = 0
    new_cards = 0
    for f, p in results:
        if p:
            if p.last_reviewed == today:
                continue
            if p.repetition > 0 and (p.next_review is None or p.next_review <= today):
                due_cards += 1
            elif p.repetition == 0:
                new_cards += 1
        else:
            new_cards += 1

    return {
        "due_cards": due_cards,
        "new_cards": new_cards,
        "completed_new": new_reviewed,
        "completed_review": review_reviewed,
        "daily_new_limit": daily_new_limit,
        "daily_review_limit": daily_review_limit,
        "total_cards": len(results)
    }
