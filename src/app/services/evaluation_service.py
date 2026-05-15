import json
import math
import time
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from typing import Any, Iterator
from uuid import uuid4

from sqlmodel import Session, select

from src.app.core.config import DEFAULT_MODEL
from src.app.core.time import default_timezone_name, local_date, utc_now_naive
from src.app.models.domain import AIOperationLog, CoachMessage, GoalReadinessSnapshot, Progress, ReviewHistory, TelemetryEvent

GPT_4O_MINI_INPUT_COST_PER_1M = 0.15
GPT_4O_MINI_OUTPUT_COST_PER_1M = 0.60


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def json_loads(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def make_generation_batch_id(prefix: str = "gen") -> str:
    return f"{prefix}_{uuid4().hex}"


def attach_generation_metadata(cards: list[dict], *, batch_id: str, origin: str) -> list[dict]:
    tagged: list[dict] = []
    for idx, card in enumerate(cards):
        if not isinstance(card, dict):
            continue
        item_id = f"{batch_id}_{idx}"
        tagged_card = dict(card)
        tagged_card["origin"] = origin
        tagged_card["generation_batch_id"] = batch_id
        tagged_card["generation_item_id"] = item_id
        tagged_card.setdefault("generated_front", tagged_card.get("front"))
        tagged_card.setdefault("generated_back", tagged_card.get("back"))
        tagged_card.setdefault("generated_difficulty", tagged_card.get("difficulty"))
        tagged.append(tagged_card)
    return tagged


def estimate_openai_cost_usd(model: str, prompt_tokens: int = 0, completion_tokens: int = 0) -> float:
    if model == "gpt-4o-mini":
        return round(
            (prompt_tokens / 1_000_000 * GPT_4O_MINI_INPUT_COST_PER_1M)
            + (completion_tokens / 1_000_000 * GPT_4O_MINI_OUTPUT_COST_PER_1M),
            6,
        )
    return 0.0


def token_usage_from_response(response: Any) -> tuple[int, int, int]:
    usage = getattr(response, "usage", None)
    if usage is None and isinstance(response, dict):
        usage = response.get("usage")
    if usage is None:
        metadata = getattr(response, "response_metadata", None)
        if isinstance(metadata, dict):
            usage = metadata.get("token_usage") or metadata.get("usage")

    def get_value(obj: Any, *names: str) -> int:
        for name in names:
            if isinstance(obj, dict) and obj.get(name) is not None:
                return int(obj[name])
            if hasattr(obj, name) and getattr(obj, name) is not None:
                return int(getattr(obj, name))
        return 0

    prompt = get_value(usage, "prompt_tokens", "input_tokens")
    completion = get_value(usage, "completion_tokens", "output_tokens")
    total = get_value(usage, "total_tokens")
    if not total:
        total = prompt + completion
    return prompt, completion, total


def log_telemetry_event(
    session: Session,
    *,
    user_id: int | None,
    event_type: str,
    target_type: str | None = None,
    target_id: str | int | None = None,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> TelemetryEvent:
    event = TelemetryEvent(
        user_id=user_id,
        event_type=event_type,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        metadata_json=json_dumps(metadata or {}),
    )
    session.add(event)
    if commit:
        session.commit()
        session.refresh(event)
    return event


def log_ai_operation(
    session: Session,
    *,
    user_id: int | None,
    operation_type: str,
    endpoint: str | None = None,
    model: str = DEFAULT_MODEL,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: int | None = None,
    latency_ms: int = 0,
    status: str = "success",
    error_message: str | None = None,
    request_count: int = 1,
    output_count: int = 0,
    accepted_count: int = 0,
    fallback_used: bool = False,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> AIOperationLog:
    total = total_tokens if total_tokens is not None else prompt_tokens + completion_tokens
    log = AIOperationLog(
        user_id=user_id,
        operation_type=operation_type,
        endpoint=endpoint,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total,
        estimated_cost_usd=estimate_openai_cost_usd(model, prompt_tokens, completion_tokens),
        latency_ms=latency_ms,
        status=status,
        error_message=(error_message or "")[:1000] or None,
        request_count=request_count,
        output_count=output_count,
        accepted_count=accepted_count,
        fallback_used=fallback_used,
        metadata_json=json_dumps(metadata or {}),
    )
    session.add(log)
    if commit:
        session.commit()
        session.refresh(log)
    return log


@contextmanager
def track_ai_operation(
    session: Session,
    *,
    user_id: int | None,
    operation_type: str,
    endpoint: str | None = None,
    model: str = DEFAULT_MODEL,
    request_count: int = 1,
    metadata: dict[str, Any] | None = None,
) -> Iterator[dict[str, Any]]:
    started = time.perf_counter()
    state: dict[str, Any] = {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "output_count": 0,
        "accepted_count": 0,
        "fallback_used": False,
        "metadata": metadata or {},
    }
    try:
        yield state
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        try:
            log_ai_operation(
                session,
                user_id=user_id,
                operation_type=operation_type,
                endpoint=endpoint,
                model=model,
                prompt_tokens=int(state.get("prompt_tokens") or 0),
                completion_tokens=int(state.get("completion_tokens") or 0),
                total_tokens=int(state.get("total_tokens") or 0),
                latency_ms=latency_ms,
                status="error",
                error_message=str(exc),
                request_count=request_count,
                output_count=int(state.get("output_count") or 0),
                accepted_count=int(state.get("accepted_count") or 0),
                fallback_used=bool(state.get("fallback_used")),
                metadata=state.get("metadata") or {},
            )
        except Exception:
            session.rollback()
        raise
    else:
        latency_ms = int((time.perf_counter() - started) * 1000)
        try:
            log_ai_operation(
                session,
                user_id=user_id,
                operation_type=operation_type,
                endpoint=endpoint,
                model=model,
                prompt_tokens=int(state.get("prompt_tokens") or 0),
                completion_tokens=int(state.get("completion_tokens") or 0),
                total_tokens=int(state.get("total_tokens") or 0),
                latency_ms=latency_ms,
                status="success",
                request_count=request_count,
                output_count=int(state.get("output_count") or 0),
                accepted_count=int(state.get("accepted_count") or 0),
                fallback_used=bool(state.get("fallback_used")),
                metadata=state.get("metadata") or {},
            )
        except Exception:
            session.rollback()


def log_review_history(
    session: Session,
    *,
    user_id: int,
    card_id: int,
    deck_id: int | None,
    review_date: str,
    quality: int,
    previous_quality: int | None,
    ease_factor: float,
    previous_ease_factor: float | None,
    interval: int,
    previous_interval: int | None,
    repetition: int,
    previous_repetition: int | None,
    scheduled_review: str | None,
    days_since_last_review: int | None,
    review_source: str = "study",
    used_hint: bool = False,
    was_due: bool = False,
) -> ReviewHistory:
    was_mastered = (
        previous_ease_factor is not None
        and previous_ease_factor >= 2.5
        and (previous_repetition or 0) >= 3
        and (previous_quality or -1) >= 2
    )
    is_mastered = ease_factor >= 2.5 and repetition >= 3 and quality >= 2
    was_correct = (previous_quality or -1) >= 2
    history = ReviewHistory(
        user_id=user_id,
        card_id=card_id,
        deck_id=deck_id,
        review_date=review_date,
        reviewed_at=utc_now_naive(),
        quality=quality,
        previous_quality=previous_quality,
        ease_factor=ease_factor,
        previous_ease_factor=previous_ease_factor,
        interval=interval,
        previous_interval=previous_interval,
        repetition=repetition,
        previous_repetition=previous_repetition,
        scheduled_review=scheduled_review,
        days_since_last_review=days_since_last_review,
        review_source=review_source,
        used_hint=used_hint,
        is_correct=quality >= 2,
        was_due=was_due,
        became_mastered=(not was_mastered) and is_mastered,
        became_forgotten=was_correct and quality in (0, 1),
    )
    session.add(history)
    return history


def log_goal_readiness_snapshot(
    session: Session,
    *,
    goal_id: int,
    user_id: int,
    deck_id: int,
    target_date: str,
    desired_mastery: int,
    predicted_readiness: int,
    current_mastery: int,
    due_cards: int,
    new_cards: int,
    weak_cards: int,
    workload_cards: int,
    recommended_daily_cards: int,
    days_remaining: int,
    commit: bool = False,
) -> GoalReadinessSnapshot:
    snapshot = GoalReadinessSnapshot(
        goal_id=goal_id,
        user_id=user_id,
        deck_id=deck_id,
        target_date=target_date,
        desired_mastery=desired_mastery,
        predicted_readiness=predicted_readiness,
        current_mastery=current_mastery,
        due_cards=due_cards,
        new_cards=new_cards,
        weak_cards=weak_cards,
        workload_cards=workload_cards,
        recommended_daily_cards=recommended_daily_cards,
        days_remaining=days_remaining,
    )
    session.add(snapshot)
    if commit:
        session.commit()
        session.refresh(snapshot)
    return snapshot


def days_between(start: str | None, end: str) -> int | None:
    if not start:
        return None
    try:
        return (date.fromisoformat(end) - date.fromisoformat(start)).days
    except ValueError:
        return None


def _percentile(values: list[int], pct: float) -> int:
    if not values:
        return 0
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil((pct / 100) * len(ordered)) - 1))
    return ordered[index]


def _window_bounds(days: int = 7) -> tuple[datetime, date, str]:
    today = local_date(default_timezone_name())
    start_date = today - timedelta(days=max(0, days - 1))
    start_dt = datetime.combine(start_date, datetime.min.time())
    return start_dt, today, start_date.isoformat()


def _ai_candidate_operation(operation_type: str) -> bool:
    return operation_type in {
        "generate_cards_preview",
        "generate_cards_save",
        "generate_image_cards_preview",
        "generate_image_cards_save",
        "generate_vocab_cards_preview",
    }


def _meaningful_event_types() -> set[str]:
    return {
        "ai_card_accepted",
        "coach_quiz_started",
        "coach_quiz_completed",
        "adventure_campaign_completed",
        "notification_impression",
        "notification_sent",
    }


def get_pilot_evaluation(session: Session, days: int = 7) -> dict[str, Any]:
    window_start_dt, today, window_start = _window_bounds(days)
    today_key = today.isoformat()
    retention_start_dt = datetime.combine(today - timedelta(days=14), datetime.min.time())

    review_rows = list(
        session.exec(
            select(ReviewHistory).where(ReviewHistory.reviewed_at >= window_start_dt)
        ).all()
    )
    telemetry_rows = list(
        session.exec(
            select(TelemetryEvent).where(TelemetryEvent.created_at >= window_start_dt)
        ).all()
    )
    ai_rows = list(
        session.exec(
            select(AIOperationLog).where(AIOperationLog.created_at >= window_start_dt)
        ).all()
    )
    retention_review_rows = list(
        session.exec(
            select(ReviewHistory).where(ReviewHistory.reviewed_at >= retention_start_dt)
        ).all()
    )
    retention_telemetry_rows = list(
        session.exec(
            select(TelemetryEvent).where(TelemetryEvent.created_at >= retention_start_dt)
        ).all()
    )
    retention_ai_rows = list(
        session.exec(
            select(AIOperationLog).where(AIOperationLog.created_at >= retention_start_dt)
        ).all()
    )
    coach_rows = list(
        session.exec(
            select(CoachMessage).where(CoachMessage.created_at >= window_start_dt)
        ).all()
    )
    snapshot_rows = list(session.exec(select(GoalReadinessSnapshot)).all())

    active_users: set[int] = set()
    for row in review_rows:
        active_users.add(row.user_id)
    for row in telemetry_rows:
        if row.user_id and row.event_type in _meaningful_event_types():
            active_users.add(row.user_id)
    for row in ai_rows:
        if row.user_id:
            active_users.add(row.user_id)

    weekly_active_learners = len(active_users)

    mastered_transitions = sum(1 for row in review_rows if row.became_mastered)
    mastered_per_active = round(mastered_transitions / weekly_active_learners, 2) if weekly_active_learners else 0.0

    completed_due_today = sum(1 for row in review_rows if row.review_date == today_key and row.was_due)
    overdue_remaining_today = session.exec(
        select(Progress).where(
            Progress.repetition > 0,
            Progress.next_review.is_not(None),
            Progress.next_review <= today_key,
            Progress.last_reviewed != today_key,
        )
    ).all()
    due_denominator = completed_due_today + len(overdue_remaining_today)
    due_completion_rate = round((completed_due_today / due_denominator) * 100, 1) if due_denominator else 0.0

    # D7 retention based on the first meaningful learning event, since `users.created_at` is not stored.
    user_activity: dict[int, list[date]] = {}
    for row in retention_review_rows:
        user_activity.setdefault(row.user_id, []).append(row.reviewed_at.date())
    for row in retention_telemetry_rows:
        if row.user_id:
            user_activity.setdefault(row.user_id, []).append(row.created_at.date())
    for row in retention_ai_rows:
        if row.user_id:
            user_activity.setdefault(row.user_id, []).append(row.created_at.date())
    d7_cohort = 0
    d7_retained = 0
    target_first_day = today - timedelta(days=7)
    for user_id, dates in user_activity.items():
        first_day = min(dates)
        if first_day != target_first_day:
            continue
        d7_cohort += 1
        if today in dates:
            d7_retained += 1
    d7_retention = round((d7_retained / d7_cohort) * 100, 1) if d7_cohort else None

    ai_candidate_total = sum(row.output_count for row in ai_rows if _ai_candidate_operation(row.operation_type))
    ai_accepted = sum(1 for row in telemetry_rows if row.event_type == "ai_card_accepted")
    ai_acceptance_rate = round((ai_accepted / ai_candidate_total) * 100, 1) if ai_candidate_total else 0.0

    ai_edit_count = 0
    for row in telemetry_rows:
        metadata = json_loads(row.metadata_json, {})
        if row.event_type == "ai_card_edited_before_save":
            ai_edit_count += 1
        elif row.event_type == "card_edited" and str(metadata.get("origin", "")).startswith("ai"):
            ai_edit_count += 1
    ai_delete_count = sum(
        1
        for row in telemetry_rows
        if row.event_type == "card_deleted" and json_loads(row.metadata_json, {}).get("origin", "").startswith("ai")
    )
    ai_edit_rate = round((ai_edit_count / ai_accepted) * 100, 1) if ai_accepted else 0.0
    ai_delete_rate = round((ai_delete_count / ai_accepted) * 100, 1) if ai_accepted else 0.0

    coach_action_clicks = sum(1 for row in telemetry_rows if row.event_type == "coach_action_click")
    coach_actions_shown = 0
    for row in coach_rows:
        actions = json_loads(row.actions_json, [])
        if row.role == "assistant" and isinstance(actions, list):
            coach_actions_shown += len(actions)
    coach_action_ctr = round((coach_action_clicks / coach_actions_shown) * 100, 1) if coach_actions_shown else 0.0

    latest_snapshot_by_goal: dict[int, GoalReadinessSnapshot] = {}
    readiness_total = 0
    readiness_good = 0
    for snapshot in snapshot_rows:
        latest = latest_snapshot_by_goal.get(snapshot.goal_id)
        if latest is None or snapshot.created_at > latest.created_at:
            latest_snapshot_by_goal[snapshot.goal_id] = snapshot
    for snapshot in snapshot_rows:
        latest = latest_snapshot_by_goal.get(snapshot.goal_id)
        if latest is None or latest.created_at <= snapshot.created_at:
            continue
        error = abs(snapshot.predicted_readiness - latest.current_mastery)
        readiness_total += 1
        if error <= 15:
            readiness_good += 1
    exam_goal_readiness_accuracy = round((readiness_good / readiness_total) * 100, 1) if readiness_total else None

    ai_latencies = [row.latency_ms for row in ai_rows if row.latency_ms > 0]
    p95_latency_ms = _percentile(ai_latencies, 95)
    latency_breakdown = {}
    for operation_type in {row.operation_type for row in ai_rows}:
        latency_breakdown[operation_type] = _percentile(
            [item.latency_ms for item in ai_rows if item.operation_type == operation_type and item.latency_ms > 0],
            95,
        )

    total_openai_cost = round(sum(row.estimated_cost_usd for row in ai_rows), 6)
    cost_per_active_learner = round(total_openai_cost / weekly_active_learners, 6) if weekly_active_learners else 0.0

    return {
        "window": {
            "days": days,
            "start_date": window_start,
            "end_date": today_key,
            "d7_retention_note": "Computed from first meaningful learning event because users.created_at is not stored.",
        },
        "metrics": {
            "weekly_active_learners": {
                "value": weekly_active_learners,
                "unit": "learners",
            },
            "mastered_cards_per_active_learner_per_week": {
                "value": mastered_per_active,
                "unit": "cards_per_active_learner",
                "mastered_cards": mastered_transitions,
                "active_learners": weekly_active_learners,
            },
            "due_card_completion_rate": {
                "value": due_completion_rate,
                "unit": "percent",
                "completed_due_today": completed_due_today,
                "remaining_overdue_today": len(overdue_remaining_today),
                "denominator": due_denominator,
            },
            "seven_day_retention": {
                "value": d7_retention,
                "unit": "percent",
                "cohort_size": d7_cohort,
                "retained_users": d7_retained,
            },
            "ai_card_acceptance_rate": {
                "value": ai_acceptance_rate,
                "unit": "percent",
                "accepted_cards": ai_accepted,
                "generated_candidates": ai_candidate_total,
            },
            "ai_card_edit_delete_rate": {
                "value": {
                    "edit_rate_percent": ai_edit_rate,
                    "delete_rate_percent": ai_delete_rate,
                },
                "unit": "percent",
                "edited_cards": ai_edit_count,
                "deleted_cards": ai_delete_count,
                "accepted_cards": ai_accepted,
            },
            "coach_action_click_through_rate": {
                "value": coach_action_ctr,
                "unit": "percent",
                "action_clicks": coach_action_clicks,
                "actions_shown": coach_actions_shown,
            },
            "exam_goal_readiness_accuracy": {
                "value": exam_goal_readiness_accuracy,
                "unit": "percent",
                "accurate_snapshots": readiness_good,
                "evaluated_snapshots": readiness_total,
            },
            "p95_latency_for_ai_endpoints": {
                "value": p95_latency_ms,
                "unit": "ms",
                "breakdown_ms": latency_breakdown,
            },
            "openai_cost_per_active_learner": {
                "value": cost_per_active_learner,
                "unit": "usd",
                "total_openai_cost_usd": total_openai_cost,
                "active_learners": weekly_active_learners,
            },
        },
    }
