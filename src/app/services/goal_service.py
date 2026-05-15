import datetime

from sqlmodel import Session, select

from src.app.core.time import local_date, utc_now_naive
from src.app.models.domain import Deck, Flashcard, GoalReadinessSnapshot, LearningGoal, Progress
from src.app.services import evaluation_service
from src.app.services.timezone_service import get_user_timezone


def _parse_date(value: str) -> datetime.date:
    return datetime.datetime.strptime(value, "%Y-%m-%d").date()


def _goal_stats(session: Session, user_id: int, deck_id: int) -> dict:
    today = local_date(get_user_timezone(session, user_id)).strftime("%Y-%m-%d")
    rows = session.exec(
        select(Flashcard, Progress)
        .join(Progress, (Flashcard.id == Progress.card_id) & (Progress.user_id == user_id), isouter=True)
        .where(Flashcard.deck_id == deck_id)
    ).all()

    due_cards = 0
    new_cards = 0
    weak_cards = 0
    reviewed_cards = 0
    for card, progress in rows:
        if progress:
            if progress.repetition > 0:
                reviewed_cards += 1
            if progress.last_reviewed != today:
                if progress.repetition > 0 and (progress.next_review is None or progress.next_review <= today):
                    due_cards += 1
                elif progress.repetition == 0:
                    new_cards += 1
            if progress.last_quality in (0, 1) or (progress.ease_factor is not None and progress.ease_factor < 2.1):
                weak_cards += 1
        else:
            new_cards += 1
        if card.difficulty == "hard":
            weak_cards += 1

    total_cards = len(rows)
    mastered_cards = max(0, reviewed_cards - weak_cards)
    current_mastery = round((mastered_cards / total_cards) * 100) if total_cards else 0
    workload_cards = due_cards + new_cards + weak_cards
    return {
        "due_cards": due_cards,
        "new_cards": new_cards,
        "weak_cards": min(weak_cards, total_cards),
        "total_cards": total_cards,
        "workload_cards": workload_cards,
        "current_mastery": current_mastery,
    }


def _goal_to_response(session: Session, goal: LearningGoal) -> dict:
    deck = session.get(Deck, goal.deck_id)
    today = local_date(get_user_timezone(session, goal.user_id))
    try:
        target = _parse_date(goal.target_date)
    except ValueError:
        target = today
    days_remaining = max(0, (target - today).days)
    stats = _goal_stats(session, goal.user_id, goal.deck_id)
    workload_cards = stats["workload_cards"]
    recommended_daily = max(goal.daily_workload, (workload_cards + max(days_remaining, 1) - 1) // max(days_remaining, 1))
    readiness = max(0, min(100, round((stats["current_mastery"] * 0.7) + ((100 - min(100, workload_cards * 4)) * 0.3))))

    if days_remaining <= 3 or recommended_daily > goal.daily_workload * 1.5:
        urgency = "high"
    elif days_remaining <= 7 or workload_cards > goal.daily_workload:
        urgency = "medium"
    else:
        urgency = "low"

    plan_summary = (
        f"Còn {days_remaining} ngày. Nên xử lý khoảng {recommended_daily} thẻ/ngày "
        f"để hướng tới {goal.desired_mastery}% mastery."
    )

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "deck_id": goal.deck_id,
        "deck_name": deck.name if deck else "Deck",
        "goal_type": goal.goal_type,
        "target_date": goal.target_date,
        "desired_mastery": goal.desired_mastery,
        "daily_workload": goal.daily_workload,
        "status": goal.status,
        "days_remaining": days_remaining,
        "due_cards": stats["due_cards"],
        "new_cards": stats["new_cards"],
        "weak_cards": stats["weak_cards"],
        "total_cards": stats["total_cards"],
        "workload_cards": workload_cards,
        "current_mastery": stats["current_mastery"],
        "recommended_daily_cards": recommended_daily,
        "readiness_score": readiness,
        "urgency": urgency,
        "plan_summary": plan_summary,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }


def _maybe_snapshot_goal(session: Session, goal: LearningGoal, goal_response: dict) -> None:
    today = local_date(get_user_timezone(session, goal.user_id)).strftime("%Y-%m-%d")
    existing = session.exec(
        select(GoalReadinessSnapshot)
        .where(GoalReadinessSnapshot.goal_id == goal.id)
        .where(GoalReadinessSnapshot.created_at >= datetime.datetime.strptime(today, "%Y-%m-%d"))
        .order_by(GoalReadinessSnapshot.created_at.desc())
    ).first()
    if existing:
        return
    evaluation_service.log_goal_readiness_snapshot(
        session,
        goal_id=goal.id,
        user_id=goal.user_id,
        deck_id=goal.deck_id,
        target_date=goal.target_date,
        desired_mastery=goal.desired_mastery,
        predicted_readiness=goal_response["readiness_score"],
        current_mastery=goal_response["current_mastery"],
        due_cards=goal_response["due_cards"],
        new_cards=goal_response["new_cards"],
        weak_cards=goal_response["weak_cards"],
        workload_cards=goal_response["workload_cards"],
        recommended_daily_cards=goal_response["recommended_daily_cards"],
        days_remaining=goal_response["days_remaining"],
        commit=False,
    )


def list_goals(session: Session, user_id: int) -> list[dict]:
    goals = session.exec(
        select(LearningGoal)
        .where(LearningGoal.user_id == user_id, LearningGoal.status == "active")
        .order_by(LearningGoal.target_date.asc())
    ).all()
    responses = [_goal_to_response(session, goal) for goal in goals]
    changed = False
    for goal, response in zip(goals, responses):
        before = len(session.new)
        _maybe_snapshot_goal(session, goal, response)
        changed = changed or len(session.new) > before
    if changed:
        session.commit()
    return responses


def upsert_goal(
    session: Session,
    user_id: int,
    deck_id: int,
    target_date: str,
    desired_mastery: int,
    daily_workload: int,
) -> dict:
    deck = session.exec(select(Deck).where(Deck.id == deck_id, Deck.user_id == user_id)).first()
    if not deck:
        raise ValueError("DECK_NOT_FOUND")
    _parse_date(target_date)

    goal = session.exec(
        select(LearningGoal).where(LearningGoal.user_id == user_id, LearningGoal.deck_id == deck_id)
    ).first()
    if not goal:
        goal = LearningGoal(user_id=user_id, deck_id=deck_id, target_date=target_date)

    goal.target_date = target_date
    goal.desired_mastery = desired_mastery
    goal.daily_workload = daily_workload
    goal.status = "active"
    goal.updated_at = utc_now_naive()
    session.add(goal)
    session.commit()
    session.refresh(goal)
    response = _goal_to_response(session, goal)
    _maybe_snapshot_goal(session, goal, response)
    session.commit()
    return response


def delete_goal(session: Session, user_id: int, goal_id: int) -> int | None:
    goal = session.exec(select(LearningGoal).where(LearningGoal.id == goal_id, LearningGoal.user_id == user_id)).first()
    if not goal:
        return None
    session.delete(goal)
    session.commit()
    return goal_id


def notification_strategy() -> dict:
    return {
        "status": "spec_only",
        "channels": ["in_app", "email_later", "push_later"],
        "preferences": {
            "opt_in_required": True,
            "quiet_hours_default": "22:00-08:00",
            "per_user_timezone": True,
            "per_trigger_toggle": True,
        },
        "triggers": [
            {
                "type": "due_cards",
                "description": "Nhắc khi còn thẻ đến hạn vào khung giờ học của user.",
                "default_enabled": True,
            },
            {
                "type": "streak_risk",
                "description": "Nhắc nhẹ nếu user sắp mất streak trong ngày.",
                "default_enabled": True,
            },
            {
                "type": "exam_urgency",
                "description": "Nhắc khi mục tiêu thi còn ít ngày hoặc workload/ngày vượt preference.",
                "default_enabled": True,
            },
            {
                "type": "coach_recommendation",
                "description": "Gợi ý hành động tiếp theo từ Memio Coach dựa trên learning state.",
                "default_enabled": False,
            },
        ],
    }
