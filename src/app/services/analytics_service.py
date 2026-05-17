import datetime
from sqlmodel import Session, select, func, case
from src.app.core.time import date_key, local_date
from src.app.models.domain import Deck, Flashcard, Progress, StudySession, User
from src.app.services.timezone_service import get_user_timezone

def get_analytics(session: Session, user_id: int):
    user_timezone = get_user_timezone(session, user_id)
    # 1. Streak
    date_statement = select(StudySession.session_date).where(StudySession.user_id == user_id).distinct().order_by(StudySession.session_date.desc())
    dates = session.exec(date_statement).all()
    streak = _calculate_streak(dates, user_timezone)

    # 2. Heatmap
    today_local = local_date(user_timezone)
    since_date = date_key(today_local - datetime.timedelta(days=34))
    heatmap_statement = select(StudySession.session_date, func.sum(StudySession.cards_reviewed)).where(
        StudySession.user_id == user_id,
        StudySession.session_date >= since_date
    ).group_by(StudySession.session_date)
    heatmap_results = session.exec(heatmap_statement).all()
    heatmap = {row[0]: row[1] for row in heatmap_results}

    # 2.5 Predicted mastery timeline (30 ngày tới)
    # Ý tưởng: "mastery" ~ % các thẻ mà SM-2 dự đoán sẽ đến hạn ôn trong khoảng tới ngày đó.
    today = today_local
    next_review_statement = select(Progress.next_review).where(
        Progress.user_id == user_id,
        Progress.repetition > 0,
        Progress.next_review.is_not(None),
    )
    next_review_rows = session.exec(next_review_statement).all()
    next_review_dates = []
    # SQLModel may return either scalar values or 1-tuples depending on backend/driver.
    for row in next_review_rows:
        nr = row[0] if isinstance(row, (tuple, list)) else row
        if not nr:
            continue
        try:
            next_review_dates.append(datetime.datetime.strptime(nr, "%Y-%m-%d").date())
        except Exception:
            continue

    timeline_total = len(next_review_dates)
    predicted_mastery_timeline = []
    for i in range(1, 31):
        threshold = today + datetime.timedelta(days=i)
        if timeline_total > 0:
            reached = sum(1 for d in next_review_dates if d <= threshold)
            mastery_pct = round((reached / timeline_total) * 100, 1)
        else:
            mastery_pct = 0
        predicted_mastery_timeline.append(
            {"date": (today + datetime.timedelta(days=i)).strftime("%Y-%m-%d"), "mastery": mastery_pct}
        )

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

    # 6. Weak areas recommendations (B: top decks yếu + top cards yếu EF thấp)
    weak_decks = []
    for ds in deck_stats:
        reviewed_count = ds.get("reviewed_count", 0) or 0
        hard_count = ds.get("hard_count", 0) or 0
        weak_ratio = (hard_count / reviewed_count) if reviewed_count > 0 else 0
        weak_decks.append({**ds, "weak_ratio": round(weak_ratio * 100, 1)})
    weak_decks = sorted(weak_decks, key=lambda x: x["weak_ratio"], reverse=True)[:3]

    weak_cards = hardest_cards[:5]

    # 7. Anonymous peers comparison (A: forgetting_rate + avg reviews/day)
    # - Your metrics
    user_cards_stmt = select(func.sum(StudySession.cards_reviewed)).where(
        StudySession.user_id == user_id,
        StudySession.session_date >= since_date,
    )
    user_cards_sum = session.exec(user_cards_stmt).one() or 0
    user_avg_reviews_per_day = round((float(user_cards_sum) / 35) if user_cards_sum else 0, 2)

    # - Peer metrics across non-guest users
    peer_hard_stmt = select(func.count(Progress.id)).join(User, User.id == Progress.user_id).where(
        User.is_guest == False,
        Progress.repetition > 0,
        Progress.ease_factor < 2.0,
    )
    peer_total_stmt = select(func.count(Progress.id)).join(User, User.id == Progress.user_id).where(
        User.is_guest == False,
        Progress.repetition > 0,
    )
    peer_hard_cards = session.exec(peer_hard_stmt).one() or 0
    peer_total_cards = session.exec(peer_total_stmt).one() or 0
    peer_forgetting_rate = round(
        (float(peer_hard_cards) / float(peer_total_cards) * 100) if peer_total_cards > 0 else 0,
        1,
    )

    peer_user_sums_stmt = select(StudySession.user_id, func.sum(StudySession.cards_reviewed)).join(
        User, User.id == StudySession.user_id
    ).where(
        User.is_guest == False,
        StudySession.session_date >= since_date,
    ).group_by(StudySession.user_id)
    peer_user_sums = session.exec(peer_user_sums_stmt).all()
    if peer_user_sums:
        peer_avg_sum = sum(float(row[1] or 0) for row in peer_user_sums) / len(peer_user_sums)
        peer_avg_reviews_per_day = round(peer_avg_sum / 35, 2)
    else:
        peer_avg_reviews_per_day = 0

    return {
        "streak": streak,
        "heatmap": heatmap,
        "hardest_cards": hardest_cards,
        "forgetting_rate": forgetting_rate,
        "total_reviewed": total_reviewed,
        "deck_stats": deck_stats,
        "predicted_mastery_timeline": predicted_mastery_timeline,
        "weak_areas": {
            "weak_decks": weak_decks,
            "weak_cards": weak_cards,
        },
        "peers_comparison": {
            "your_forgetting_rate": forgetting_rate,
            "peer_forgetting_rate": peer_forgetting_rate,
            "your_avg_reviews_per_day": user_avg_reviews_per_day,
            "peer_avg_reviews_per_day": peer_avg_reviews_per_day,
        },
    }


def _calculate_streak(dates, timezone_name: str | None = None):
    if not dates:
        return 0
    streak = 0
    current = local_date(timezone_name)
    yesterday = current - datetime.timedelta(days=1)

    # Clean up dates to set of date objects for easier comparison
    date_objs = set()
    for d in dates:
        try:
            date_objs.add(datetime.datetime.strptime(d, "%Y-%m-%d").date())
        except Exception:
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
