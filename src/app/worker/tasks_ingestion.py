import asyncio

from celery import shared_task
from sqlmodel import Session, select

from src.app.db.session import engine
from src.app.core.time import utc_now_naive
from src.app.models.domain import IngestionSource
from src.app.services import ingestion_service


@shared_task(name="src.app.worker.tasks_ingestion.sync_ingestion_sources")
def sync_ingestion_sources():
    now = utc_now_naive()
    synced_source_ids: list[int] = []
    skipped_source_ids: list[int] = []

    with Session(engine) as session:
        sources = session.exec(
            select(IngestionSource).where(IngestionSource.status == "active").order_by(IngestionSource.created_at.asc())
        ).all()

        for source in sources:
            if source.provider not in {"rss", "notion", "obsidian"}:
                skipped_source_ids.append(source.id)
                continue
            if source.provider == "obsidian":
                skipped_source_ids.append(source.id)
                continue

            last_synced = source.last_synced_at
            interval = max(int(source.frequency_minutes or 0), 5)
            if last_synced is not None:
                delta = now - last_synced
                if delta.total_seconds() < interval * 60:
                    continue

            asyncio.run(ingestion_service.sync_source(session, source, preview_only=False))
            synced_source_ids.append(source.id)

    return {
        "synced_source_ids": synced_source_ids,
        "skipped_source_ids": skipped_source_ids,
        "timestamp": now.isoformat(),
    }
