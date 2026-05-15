import datetime
import logging

from sqlalchemy import or_
from sqlmodel import Session, select, func

from src.app.core.config import settings
from src.app.core.time import date_key, local_date
from src.app.models.domain import (
    ChatIntegration,
    Deck,
    Flashcard,
    LearningGoal,
    Progress,
    StudySession,
)
from src.app.services import evaluation_service
from src.app.services.telegram_service import TelegramConfigError, send_message
from src.app.services.timezone_service import get_user_timezone

logger = logging.getLogger(__name__)

_ALERT_ICONS = {
    "due_cards": "📚",
    "streak_risk": "🔥",
    "exam_urgency": "⏰",
}


def get_user_alerts(session: Session, user_id: int) -> list[dict]:
    tz = get_user_timezone(session, user_id)
    today = date_key(local_date(tz))
    alerts: list[dict] = []

    # 1. Due cards
    due_count = session.exec(
        select(func.count()).select_from(Progress).where(
            Progress.user_id == user_id,
            Progress.repetition > 0,
            or_(Progress.next_review.is_(None), Progress.next_review <= today),
        )
    ).one()
    if due_count and due_count > 0:
        alerts.append({
            "type": "due_cards",
            "title": f"Có {due_count} thẻ cần ôn tập",
            "body": "Ôn ngay để không quên kiến thức đã học!",
        })

    # 2. Streak risk — only alert when user hasn't studied today but has an active streak
    studied_today = session.exec(
        select(StudySession).where(
            StudySession.user_id == user_id,
            StudySession.session_date == today,
        )
    ).first()
    if not studied_today:
        date_rows = session.exec(
            select(StudySession.session_date)
            .where(StudySession.user_id == user_id)
            .distinct()
            .order_by(StudySession.session_date.desc())
        ).all()
        streak = _compute_streak(date_rows, tz)
        if streak > 0:
            alerts.append({
                "type": "streak_risk",
                "title": f"Streak {streak} ngày sắp mất!",
                "body": "Bạn chưa học hôm nay. Học ngay để giữ streak!",
            })

    # 3. Exam urgency
    goals = session.exec(
        select(LearningGoal).where(
            LearningGoal.user_id == user_id,
            LearningGoal.status == "active",
        )
    ).all()
    today_date = local_date(tz)
    for goal in goals:
        try:
            target = datetime.datetime.strptime(goal.target_date, "%Y-%m-%d").date()
            days_left = (target - today_date).days
            if 0 < days_left <= 14:
                deck = session.get(Deck, goal.deck_id)
                deck_name = deck.name if deck else f"Deck #{goal.deck_id}"
                alerts.append({
                    "type": "exam_urgency",
                    "title": f"Còn {days_left} ngày đến kỳ thi",
                    "body": f"{deck_name}: mục tiêu {goal.desired_mastery}% thành thạo.",
                })
        except Exception:
            continue

    return alerts


def build_telegram_message(alerts: list[dict]) -> str:
    lines = ["🔔 *Nhắc học Memio*", ""]
    for alert in alerts:
        icon = _ALERT_ICONS.get(alert["type"], "•")
        lines.append(f"{icon} {alert['title']}")
        lines.append(f"  _{alert['body']}_")
    lines.append("")
    lines.append(f"👉 [{settings.APP_URL}]({settings.APP_URL})")
    return "\n".join(lines)


async def send_due_notifications(session: Session) -> int:
    """Send Telegram DM to all linked users who have pending alerts. Max once per day per user."""
    integrations = session.exec(
        select(ChatIntegration).where(
            ChatIntegration.provider == "telegram",
            ChatIntegration.dm_chat_id.isnot(None),
        )
    ).all()

    sent = 0
    for integ in integrations:
        tz = get_user_timezone(session, integ.user_id)
        today = date_key(local_date(tz))

        if integ.sent_today_date == today and (integ.sent_today or 0) >= 1:
            continue

        alerts = get_user_alerts(session, integ.user_id)
        if not alerts:
            continue

        text = build_telegram_message(alerts)
        try:
            await send_message(
                chat_id=str(integ.dm_chat_id),
                text=text,
            )
            evaluation_service.log_telemetry_event(
                session,
                user_id=integ.user_id,
                event_type="notification_sent",
                target_type="telegram",
                target_id=integ.dm_chat_id,
                metadata={"alert_types": [alert["type"] for alert in alerts]},
                commit=False,
            )
            integ.sent_today_date = today
            integ.sent_today = (integ.sent_today or 0) + 1
            session.add(integ)
            session.commit()
            sent += 1
        except TelegramConfigError:
            logger.warning("Telegram không được cấu hình — bỏ qua notifications.")
            break
        except Exception as exc:
            logger.error("send_due_notifications: lỗi gửi user %d — %s", integ.user_id, exc)
            continue

    return sent


def _compute_streak(date_rows: list[str], tz: str) -> int:
    today = local_date(tz)
    yesterday = today - datetime.timedelta(days=1)
    date_set = set()
    for d in date_rows:
        try:
            date_set.add(datetime.datetime.strptime(d, "%Y-%m-%d").date())
        except Exception:
            continue
    if not date_set:
        return 0
    check = today if today in date_set else (yesterday if yesterday in date_set else None)
    if check is None:
        return 0
    streak = 0
    while check in date_set:
        streak += 1
        check -= datetime.timedelta(days=1)
    return streak
