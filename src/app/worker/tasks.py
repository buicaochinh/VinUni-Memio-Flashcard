import datetime

from celery import shared_task
from sqlmodel import Session, select

from src.app.db.session import engine
from src.app.models.domain import ChatIntegration, Flashcard, Progress
from src.app.services.telegram_service import send_message_sync


@shared_task(name="src.app.worker.tasks.send_due_cards")
def send_due_cards():
    """
    Starter task: just finds users with due cards.

    Next step: fetch card content and send to Telegram/Discord.
    """
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    with Session(engine) as session:
        # Find integrations
        integrations = session.exec(
            select(ChatIntegration).where(ChatIntegration.provider == "telegram")
        ).all()

        due_counts = {}
        for integ in integrations:
            # Due cards for user: next_review <= today
            due = session.exec(
                select(Progress).where(
                    Progress.user_id == integ.user_id,
                    Progress.next_review.is_not(None),
                    Progress.next_review <= today,
                )
            ).all()
            due_counts[integ.user_id] = len(due)

            if not integ.dm_chat_id:
                continue
            if not due:
                continue

            # pick first due card
            card_id = due[0].card_id
            card = session.get(Flashcard, card_id)
            if not card:
                continue

            # Inline rating buttons
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

    return {"today": today, "due_counts": due_counts}

