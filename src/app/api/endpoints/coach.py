from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from src.app.api.deps import get_current_user_id
from src.app.db.session import get_session
from src.app.models.domain import Deck
from src.app.schemas.coach import (
    CoachLearningIntelligenceResponse,
    CoachMessageRequest,
    CoachMessageResponse,
    CoachQuizStartRequest,
    CoachQuizStartResponse,
    CoachQuizSummaryRequest,
    CoachQuizSummaryResponse,
    CoachStoredMessage,
    CoachThreadSummary,
    CoachTrustEventRequest,
)
from src.app.services import coach_service
from src.app.services import evaluation_service

router = APIRouter()


@router.get("/threads", response_model=list[CoachThreadSummary])
def list_threads(limit: int = 20, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    return coach_service.list_threads(session, user_id, limit)


@router.get("/threads/{thread_id}/messages", response_model=list[CoachStoredMessage])
def list_messages(thread_id: int, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    return [coach_service.stored_message_to_dict(m) for m in coach_service.list_messages(session, user_id, thread_id)]


@router.get("/learning-intelligence", response_model=CoachLearningIntelligenceResponse)
def get_learning_intelligence(limit: int = 4, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    return coach_service.build_learning_intelligence(session, user_id, limit)


@router.post("/message", response_model=CoachMessageResponse)
def send_message(payload: CoachMessageRequest, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    text = payload.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Tin nhan khong duoc de trong.")

    thread = coach_service.get_or_create_thread(
        session,
        user_id,
        payload.thread_id,
        payload.context_deck_id,
    )
    coach_service.save_message(session, thread, user_id, "user", text)

    context, available_citations, default_deck_id = coach_service.build_context(
        session,
        user_id,
        text,
        payload.context_deck_id or thread.context_deck_id,
    )
    valid_deck_ids = set(session.exec(select(Deck.id).where(Deck.user_id == user_id)).all())
    answer, citations, actions = coach_service.call_coach_llm(
        session,
        user_id,
        text,
        context,
        available_citations,
        default_deck_id,
        payload.mode,
        valid_deck_ids,
    )
    coach_service.save_message(session, thread, user_id, "assistant", answer, citations, actions)
    return {
        "thread_id": thread.id,
        "answer": answer,
        "citations": citations,
        "actions": actions,
    }


@router.post("/quiz/start", response_model=CoachQuizStartResponse)
def start_inline_quiz(payload: CoachQuizStartRequest, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    questions = coach_service.build_inline_quiz(
        session,
        user_id,
        payload.deck_id,
        payload.count,
        payload.card_ids,
    )
    if not questions:
        raise HTTPException(status_code=422, detail="Can it nhat 2 flashcards de quiz trong chat.")
    evaluation_service.log_telemetry_event(
        session,
        user_id=user_id,
        event_type="coach_quiz_started",
        target_type="deck",
        target_id=payload.deck_id,
        metadata={
            "question_count": len(questions),
            "scoped_card_count": len(payload.card_ids or []),
        },
    )
    return {"questions": questions}


@router.post("/quiz/summary", response_model=CoachQuizSummaryResponse)
def save_inline_quiz_summary(payload: CoachQuizSummaryRequest, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    summary = payload.summary.strip()
    if not summary:
        raise HTTPException(status_code=422, detail="Tom tat quiz khong duoc de trong.")

    thread = coach_service.get_or_create_thread(
        session,
        user_id,
        payload.thread_id,
        payload.context_deck_id,
    )
    message = coach_service.save_message(
        session,
        thread,
        user_id,
        "assistant",
        summary,
        citations=[],
        actions=[action.model_dump() for action in payload.actions],
    )
    evaluation_service.log_telemetry_event(
        session,
        user_id=user_id,
        event_type="coach_quiz_completed",
        target_type="coach_thread",
        target_id=thread.id,
        metadata={
            "context_deck_id": payload.context_deck_id,
            "action_count": len(payload.actions),
        },
    )
    return {
        "thread_id": thread.id,
        "message": coach_service.stored_message_to_dict(message),
    }


@router.post("/trust-event")
def log_trust_event(
    payload: CoachTrustEventRequest,
    user_id: int = Depends(get_current_user_id),
    session: Session = Depends(get_session),
):
    if payload.event_type not in {"citation_click", "answer_feedback", "action_click"}:
        raise HTTPException(status_code=422, detail="Loai trust event khong hop le.")
    if payload.event_type == "answer_feedback" and payload.value not in {"helpful", "not_helpful"}:
        raise HTTPException(status_code=422, detail="Feedback khong hop le.")

    coach_service.log_trust_event(
        session=session,
        user_id=user_id,
        event_type=payload.event_type,
        thread_id=payload.thread_id,
        message_id=payload.message_id,
        citation_id=payload.citation_id,
        value=payload.value,
        source_type=payload.source_type,
        target_type=payload.target_type,
        target_id=payload.target_id,
    )
    return {"message": "success"}
