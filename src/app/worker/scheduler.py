from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.app.core.config import settings

scheduler = AsyncIOScheduler(timezone=settings.APP_TIMEZONE)


def setup_scheduler() -> None:
    from src.app.worker.tasks import send_due_cards, send_weekly_report
    from src.app.worker.tasks_ingestion import sync_ingestion_sources

    scheduler.add_job(send_due_cards, "interval", seconds=300, id="send_due_cards")
    scheduler.add_job(sync_ingestion_sources, "interval", seconds=600, id="sync_ingestion_sources")
    scheduler.add_job(
        send_weekly_report,
        CronTrigger(day_of_week="mon", hour=8, minute=0, timezone=settings.APP_TIMEZONE),
        id="weekly_report_monday",
    )
