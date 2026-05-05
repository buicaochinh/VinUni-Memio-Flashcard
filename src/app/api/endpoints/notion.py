from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.schemas.notion import NotionConnectResponse, NotionConnectionStatus, NotionPageItem
from src.app.services import notion_service


router = APIRouter()


@router.get("/connect", response_model=NotionConnectResponse)
def get_notion_connect_url(user_id: int = Depends(get_current_user_id)):
    try:
        connect_url = notion_service.get_connect_url(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"connect_url": connect_url}


@router.get("/callback")
async def notion_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    session: Session = Depends(get_session),
):
    try:
        user_id = notion_service.decode_state(state)
        await notion_service.exchange_code_for_connection(session, user_id, code)
        return RedirectResponse(notion_service.frontend_redirect_url(status="success"))
    except Exception as exc:
        message = str(exc)[:200]
        return RedirectResponse(notion_service.frontend_redirect_url(status="error", message=message))


@router.get("/status", response_model=NotionConnectionStatus)
def get_notion_status(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    row = notion_service.get_connection(session, user_id)
    if not row:
        return {"connected": False}
    return {
        "connected": True,
        "workspace_id": row.workspace_id,
        "workspace_name": row.workspace_name,
        "workspace_icon": row.workspace_icon,
        "owner_type": row.owner_type,
    }


@router.delete("/disconnect")
def disconnect_notion(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    notion_service.disconnect(session, user_id)
    return {"message": "success"}


@router.get("/pages", response_model=list[NotionPageItem])
async def list_notion_pages(
    session: Session = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    items = await notion_service.list_pages(session, user_id)
    return [NotionPageItem(**item) for item in items]
