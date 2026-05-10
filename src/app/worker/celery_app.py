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
    broker_connection_max_retries=10,
    broker_connection_retry=True,
)


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Run every 5 minutes (starter).
    sender.add_periodic_task(300.0, "src.app.worker.tasks.send_due_cards", name="send_due_cards")
    sender.add_periodic_task(
        600.0,
        "src.app.worker.tasks_ingestion.sync_ingestion_sources",
        name="sync_ingestion_sources",
    )
    # Weekly report: Monday 08:00 (worker timezone)
    sender.add_periodic_task(
        crontab(minute=0, hour=8, day_of_week=1),
        "src.app.worker.tasks.send_weekly_report",
        name="send_weekly_report",
    )
