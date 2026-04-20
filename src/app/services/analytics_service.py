import datetime
from sqlmodel import Session, select, func, case
from src.app.models.domain import Deck, Flashcard, Progress, StudySession

def get_analytics(session: Session, user_id: int):
    # 1. Streak
    date_statement = select(StudySession.session_date).where(StudySession.user_id == user_id).distinct().order_by(StudySession.session_date.desc())
    dates = session.exec(date_statement).all()
    streak = _calculate_streak(dates)

    # 2. Heatmap
    since_date = (datetime.datetime.now() - datetime.timedelta(days=35)).strftime("%Y-%m-%d")
    heatmap_statement = select(StudySession.session_date, func.sum(StudySession.cards_reviewed)).where(
        StudySession.user_id == user_id,
        StudySession.session_date >= since_date
    ).group_by(StudySession.session_date)
    heatmap_results = session.exec(heatmap_statement).all()
    heatmap = {row[0]: row[1] for row in heatmap_results}

    # 3. Hardest cards
    hardest_statement = select(Flashcard, Progress).join(Progress).where(
        Progress.user_id == user_id, 
        Progress.repetition > 0
    ).order_by(Progress.ease_factor.asc()).limit(10)
    hardest_results = session.exec(hardest_statement).all()
    hardest_cards = []
    for f, p in hardest_results:
        d = f.model_dump()
        d.update(p.model_dump(exclude={"id", "user_id", "card_id"}))
        hardest_cards.append(d)

    # 4. Global counts
    total_statement = select(func.count(Progress.id)).where(
        Progress.user_id == user_id, 
        Progress.repetition > 0
    )
    total_reviewed = session.exec(total_statement).one() or 0

    hard_statement = select(func.count(Progress.id)).where(
        Progress.user_id == user_id, 
        Progress.ease_factor < 2.0
    )
    hard_count = session.exec(hard_statement).one() or 0
    forgetting_rate = round((hard_count / total_reviewed * 100) if total_reviewed > 0 else 0, 1)

    # 5. Deck stats (including all user decks)
    # Start with Deck, then outer join Flashcard and Progress
    deck_stats_statement = select(
        Deck.name,
        Deck.id,
        func.avg(Progress.ease_factor),
        func.count(Progress.id),
        func.sum(case((Progress.ease_factor < 2.0, 1), else_=0))
    ).join(Flashcard, Deck.id == Flashcard.deck_id, isouter=True
    ).join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True
    ).where(
        Deck.user_id == user_id
    ).group_by(Deck.id, Deck.name)
    
    deck_stats_results = session.exec(deck_stats_statement).all()
    deck_stats = []
    for row in deck_stats_results:
        deck_stats.append({
            "name": row[0],
            "id": row[1],
            "avg_ef": float(row[2]) if row[2] else 0,
            "reviewed_count": row[3] if row[3] else 0,
            "hard_count": row[4] if row[4] else 0
        })

    return {
        "streak": streak,
        "heatmap": heatmap,
        "hardest_cards": hardest_cards,
        "forgetting_rate": forgetting_rate,
        "total_reviewed": total_reviewed,
        "deck_stats": deck_stats,
    }


def _calculate_streak(dates):
    if not dates:
        return 0
    streak = 0
    current = datetime.datetime.now().date()
    yesterday = current - datetime.timedelta(days=1)
    
    # Clean up dates to set of date objects for easier comparison
    date_objs = set()
    for d in dates:
        try:
            date_objs.add(datetime.datetime.strptime(d, "%Y-%m-%d").date())
        except:
            continue

    if not date_objs:
        return 0

    # Start checking from today or yesterday
    check_date = current
    if current not in date_objs:
        if yesterday in date_objs:
            check_date = yesterday
        else:
            return 0
            
    streak = 0
    while check_date in date_objs:
        streak += 1
        check_date -= datetime.timedelta(days=1)
        
    return streak
