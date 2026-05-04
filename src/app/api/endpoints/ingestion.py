from fastapi import APIRouter, Depends
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.schemas.ingestion import (
    IngestionRunItem,
    IngestionSourceCreate,
    IngestionSourceItem,
    IngestionSourceUpdate,
    IngestionSyncResponse,
)
from src.app.services import ingestion_service


router = APIRouter()


@router.get("/sources", response_model=list[IngestionSourceItem])
def list_ingestion_sources(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    rows = ingestion_service.list_sources(session, user_id)
    return [IngestionSourceItem(**row) for row in rows]


@router.post("/sources", response_model=IngestionSourceItem)
def create_ingestion_source(
    payload: IngestionSourceCreate,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    row = ingestion_service.create_source(session, user_id, payload)
    return IngestionSourceItem(**row)


@router.patch("/sources/{source_id}", response_model=IngestionSourceItem)
def update_ingestion_source(
    source_id: int,
    payload: IngestionSourceUpdate,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    row = ingestion_service.update_source(session, user_id, source_id, payload)
    return IngestionSourceItem(**row)


@router.delete("/sources/{source_id}")
def delete_ingestion_source(
    source_id: int,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    ingestion_service.delete_source(session, user_id, source_id)
    return {"message": "success", "source_id": source_id}


@router.get("/sources/{source_id}/runs", response_model=list[IngestionRunItem])
def list_ingestion_runs(
    source_id: int,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return ingestion_service.list_runs(session, user_id, source_id)


@router.post("/sources/{source_id}/sync", response_model=IngestionSyncResponse)
async def sync_ingestion_source(
    source_id: int,
    preview_only: bool = False,
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ingestion_service.sync_source_for_user(
        session,
        user_id,
        source_id,
        preview_only=preview_only,
    )
