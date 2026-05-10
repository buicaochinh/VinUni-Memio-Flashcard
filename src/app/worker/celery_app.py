from celery import Celery
from celery.schedules import crontab

from src.app.core.config import settings


celery_app = Celery(
    "memio_worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
)

celery_app.conf.update(
    timezone=settings.APP_TIMEZONE,
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    imports=("src.app.worker.tasks", "src.app.worker.tasks_ingestion"),
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=None,
    broker_connection_retry=True,
    beat_schedule={
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
    },
)
