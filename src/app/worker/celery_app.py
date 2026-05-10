from celery import Celery
from celery.schedules import crontab

from src.app.core.config import settings


print("DEBUG: [celery_app.py] Module is being loaded")

app = Celery(
    "memio",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
)

app.conf.update(
    timezone=settings.APP_TIMEZONE,
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    imports=("src.app.worker.tasks", "src.app.worker.tasks_ingestion"),
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=None,
    broker_connection_retry=True,
)

# Assign beat_schedule directly for maximum compatibility
app.conf.beat_schedule = {
    "send_due_cards_every_5m": {
        "task": "src.app.worker.tasks.send_due_cards",
        "schedule": 300.0,
    },
    "sync_ingestion_every_10m": {
        "task": "src.app.worker.tasks_ingestion.sync_ingestion_sources",
        "schedule": 600.0,
    },
    "weekly_report_monday": {
        "task": "src.app.worker.tasks.send_weekly_report",
        "schedule": crontab(minute=0, hour=8, day_of_week=1),
    },
}

print(f"DEBUG: [celery_app.py] app configured with {len(app.conf.beat_schedule)} periodic tasks")
