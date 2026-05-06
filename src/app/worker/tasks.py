import datetime

from celery import shared_task
from sqlmodel import Session, select

from src.app.db.session import engine
from src.app.core.time import (
    ensure_utc_aware,
    iso_week_key_for_local_date,
    last_n_local_date_keys,
    local_date_key,
    local_now,
    seconds_since_utc,
    utc_now_naive,
)
from src.app.models.domain import ChatIntegration, Flashcard, Progress, StudySession
from src.app.services.telegram_service import send_message_sync
from sqlalchemy import func


def _in_send_window(*, now_local: datetime.datetime, window: str) -> bool:
    """
    window: 'HH:MM-HH:MM' (local time)
    - If end <= start, treat as crossing midnight (e.g. 22:00-02:00)
    """
    try:
        start_s, end_s = window.split("-", 1)
        sh, sm = start_s.split(":")
        eh, em = end_s.split(":")
        start = int(sh) * 60 + int(sm)
        end = int(eh) * 60 + int(em)
    except Exception:
        return False

    cur = now_local.hour * 60 + now_local.minute
    if start == end:
        return True
    if end > start:
        return start <= cur <= end
    # crosses midnight
    return cur >= start or cur <= end


@shared_task(name="src.app.worker.tasks.send_due_cards")
def send_due_cards():
    """
    Starter task: just finds users with due cards.

    Next step: fetch card content and send to Telegram/Discord.
    """
    now_utc = utc_now_naive()
    max_per_run = 3
    with Session(engine) as session:
        # Find integrations
        integrations = session.exec(
            select(ChatIntegration).where(ChatIntegration.provider == "telegram")
        ).all()

        due_counts = {}
        for integ in integrations:
            now_local = local_now(integ.timezone)
            today_local = local_date_key(integ.timezone)

            # reset daily counters when local date changes
            if integ.sent_today_date != today_local:
                integ.sent_today_date = today_local
                integ.sent_today = 0
                session.add(integ)
                session.commit()

            # respect send window + daily goal
            if not _in_send_window(now_local=now_local, window=integ.send_window or ""):
                continue
            goal = max(int(integ.daily_goal or 0), 0)
            if integ.sent_today >= goal:
                continue
            # basic cooldown to prevent duplicate sends on frequent runs
            if integ.last_sent_at is not None:
                try:
                    if seconds_since_utc(integ.last_sent_at, now=ensure_utc_aware(now_utc)) < 240:
                        continue
                except Exception:
                    pass

            # prioritize overdue cards first:
            # - oldest next_review first (more overdue)
            # - then lowest ease_factor (harder cards)
            base_due = (
                select(Progress)
                .where(
                    Progress.user_id == integ.user_id,
                    Progress.next_review.is_not(None),
                    Progress.next_review <= today_local,
                )
                .order_by(Progress.next_review.asc(), Progress.ease_factor.asc(), Progress.id.asc())
            )
            due_n = session.exec(select(func.count()).select_from(base_due.subquery())).one()
            due_counts[integ.user_id] = int(due_n or 0)
            if due_n <= 0:
                continue
            if not integ.dm_chat_id:
                continue

            remaining = max(goal - int(integ.sent_today or 0), 0)
            to_send = min(max_per_run, remaining, int(due_n or 0))
            if to_send <= 0:
                continue

            due_rows = session.exec(base_due.limit(to_send)).all()

            sent = 0
            for due in due_rows:
                card_id = due.card_id
                card = session.get(Flashcard, card_id)
                if not card:
                    continue

                reply_markup = {
                    "inline_keyboard": [
                        [
                            {"text": "0 Lại", "callback_data": f"rate:{card_id}:0"},
                            {"text": "1 Khó", "callback_data": f"rate:{card_id}:1"},
                        ],
                        [
                            {"text": "2 Tốt", "callback_data": f"rate:{card_id}:2"},
                            {"text": "3 Dễ", "callback_data": f"rate:{card_id}:3"},
                        ],
                    ]
                }

                send_message_sync(
                    chat_id=integ.dm_chat_id,
                    text=f"🧠 Flashcard đến hạn\n\nQ: {card.front}\n\nA: {card.back}\n\nChấm điểm để tiếp tục:",
                    reply_markup=reply_markup,
                )
                sent += 1

            if sent > 0:
                integ.last_sent_at = now_utc
                integ.sent_today = int(integ.sent_today or 0) + sent
                integ.sent_today_date = today_local
                session.add(integ)
                session.commit()

    return {"today": local_date_key(), "due_counts": due_counts}


@shared_task(name="src.app.worker.tasks.send_weekly_report")
def send_weekly_report():
    """
    Weekly progress report (Telegram only):
    - sends to group_target_id if set, else dm_chat_id
    - idempotent per ISO week via ChatIntegration.weekly_report_week
    """
    now_utc = utc_now_naive()

    sent_to = []
    with Session(engine) as session:
        integrations = session.exec(
            select(ChatIntegration).where(ChatIntegration.provider == "telegram")
        ).all()

        for integ in integrations:
            target = integ.group_target_id or integ.dm_chat_id
            if not target:
                continue
            week_key = iso_week_key_for_local_date(integ.timezone)
            if integ.weekly_report_week == week_key:
                continue
            day_keys = last_n_local_date_keys(7, integ.timezone)

            rows = session.exec(
                select(StudySession).where(
                    StudySession.user_id == integ.user_id,
                    StudySession.session_date.in_(day_keys),
                )
            ).all()

            by_day = {k: {"cards": 0, "weighted_q": 0.0} for k in day_keys}
            for r in rows:
                k = str(r.session_date)
                if k not in by_day:
                    continue
                c = int(r.cards_reviewed or 0)
                by_day[k]["cards"] += c
                by_day[k]["weighted_q"] += float(r.avg_quality or 0.0) * c

            total_cards = sum(int(r.cards_reviewed or 0) for r in rows)
            # weighted avg_quality by cards_reviewed
            denom = sum(int(r.cards_reviewed or 0) for r in rows) or 0
            if denom > 0:
                avg_q = sum(float(r.avg_quality or 0) * int(r.cards_reviewed or 0) for r in rows) / denom
            else:
                avg_q = 0.0

            active_days = sum(1 for k in day_keys if by_day[k]["cards"] > 0)
            best_day = max(day_keys, key=lambda k: by_day[k]["cards"])

            today_local = local_date_key(integ.timezone)
            backlog = session.exec(
                select(func.count()).select_from(
                    select(Progress)
                    .where(
                        Progress.user_id == integ.user_id,
                        Progress.next_review.is_not(None),
                        Progress.next_review <= today_local,
                    )
                    .subquery()
                )
            ).one()
            backlog_n = int(backlog or 0)

            # compact bar: one char/day based on cards reviewed
            def mark(n: int) -> str:
                if n <= 0:
                    return "·"
                if n < 5:
                    return "▁"
                if n < 10:
                    return "▂"
                if n < 20:
                    return "▃"
                return "▆"

            bar = "".join(mark(by_day[k]["cards"]) for k in day_keys)

            msg = (
                "📊 Weekly report (7 ngày gần nhất)\n\n"
                f"- Tổng thẻ đã ôn: {total_cards}\n"
                f"- Số ngày có học: {active_days}/7\n"
                f"- Điểm trung bình: {avg_q:.2f} / 3.00\n"
                f"- Backlog đến hạn: {backlog_n}\n"
                f"- Ngày học nhiều nhất: {best_day} ({by_day[best_day]['cards']} thẻ)\n"
                f"- Trend: {bar}  ({day_keys[0]} → {day_keys[-1]})\n\n"
                "Tip: nếu tuần này bận, hãy giảm mục tiêu/ngày hoặc mở rộng khung giờ gửi trong mục Liên kết."
            )

            send_message_sync(chat_id=str(target), text=msg)
            integ.weekly_report_week = week_key
            integ.weekly_report_sent_at = now_utc
            session.add(integ)
            session.commit()
            sent_to.append(integ.user_id)

    return {"sent_users": sent_to}
