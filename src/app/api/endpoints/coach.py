from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.app.db.session import get_session
from src.app.models.domain import Deck
from src.app.schemas.coach import (
    CoachMessageRequest,
    CoachMessageResponse,
    CoachQuizStartRequest,
    CoachQuizStartResponse,
    CoachQuizSummaryRequest,
    CoachQuizSummaryResponse,
    CoachStoredMessage,
    CoachThreadSummary,
)
from src.app.services import coach_service

router = APIRouter()


@router.get("/threads", response_model=list[CoachThreadSummary])
def list_threads(user_id: int, limit: int = 20, session: Session = Depends(get_session)):
    return coach_service.list_threads(session, user_id, limit)


@router.get("/threads/{thread_id}/messages", response_model=list[CoachStoredMessage])
def list_messages(thread_id: int, user_id: int, session: Session = Depends(get_session)):
    return [coach_service.stored_message_to_dict(m) for m in coach_service.list_messages(session, user_id, thread_id)]


@router.post("/message", response_model=CoachMessageResponse)
def send_message(payload: CoachMessageRequest, session: Session = Depends(get_session)):
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Tin nhắn không được để trống.")

    thread = coach_service.get_or_create_thread(
        session,
        payload.user_id,
        payload.thread_id,
        payload.context_deck_id,
    )
    coach_service.save_message(session, thread, payload.user_id, "user", text)

    context, available_citations, default_deck_id = coach_service.build_context(
        session,
        payload.user_id,
        text,
        payload.context_deck_id or thread.context_deck_id,
    )
    valid_deck_ids = set(session.exec(select(Deck.id).where(Deck.user_id == payload.user_id)).all())
    answer, citations, actions = coach_service.call_coach_llm(
        text,
        context,
        available_citations,
        default_deck_id,
        payload.mode,
        valid_deck_ids,
    )
    coach_service.save_message(session, thread, payload.user_id, "assistant", answer, citations, actions)
    return {
        "thread_id": thread.id,
        "answer": answer,
        "citations": citations,
        "actions": actions,
    }


@router.post("/quiz/start", response_model=CoachQuizStartResponse)
def start_inline_quiz(payload: CoachQuizStartRequest, session: Session = Depends(get_session)):
    questions = coach_service.build_inline_quiz(session, payload.user_id, payload.deck_id, payload.count)
    if not questions:
        raise HTTPException(status_code=422, detail="Cần ít nhất 2 flashcards để quiz trong chat.")
    return {"questions": questions}


@router.post("/quiz/summary", response_model=CoachQuizSummaryResponse)
def save_inline_quiz_summary(payload: CoachQuizSummaryRequest, session: Session = Depends(get_session)):
    summary = payload.summary.strip()
    if not summary:
        raise HTTPException(status_code=422, detail="Tóm tắt quiz không được để trống.")

    thread = coach_service.get_or_create_thread(
        session,
        payload.user_id,
        payload.thread_id,
        payload.context_deck_id,
    )
    message = coach_service.save_message(
        session,
        thread,
        payload.user_id,
        "assistant",
        summary,
        citations=[],
        actions=[action.model_dump() for action in payload.actions],
    )
    return {
        "thread_id": thread.id,
        "message": coach_service.stored_message_to_dict(message),
    }
