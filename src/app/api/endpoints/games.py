import json

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.prompts import PromptTemplate
from sqlalchemy.exc import ProgrammingError
from sqlmodel import Session

from src.app.api.deps import get_current_user_id
from src.app.api.endpoints.cards import get_llm
from src.app.db.session import get_session
from src.app.schemas.game import (
    GameCompleteRequest,
    GameCompleteResponse,
    GameSessionSummary,
    GameStartRequest,
    GameStartResponse,
)
from src.app.services import game_service

router = APIRouter()


CAMPAIGN_PROMPT = PromptTemplate.from_template(
    """You are the AI game master for Memio, a learning app.
Create a short Adventure Campaign from the flashcards below.

Rules:
- Call the OpenAI model only once by returning the full campaign now.
- Use the same language as the flashcards.
- Create 2-3 stages, each with 3-5 questions.
- Every question must map to one provided card_id.
- Use multiple choice only.
- Distractors must be plausible but clearly wrong.
- Keep copy concise and suitable for a focused study game.
- Return ONLY valid JSON, no markdown.

JSON schema:
{{
  "title": "campaign title",
  "premise": "short story setup",
  "final_goal": "what the learner is trying to complete",
  "stages": [
    {{
      "id": "stage-1",
      "title": "stage title",
      "mission": "one sentence mission",
      "questions": [
        {{
          "id": "s1-q1",
          "card_id": 123,
          "prompt": "question",
          "choices": ["A", "B", "C", "D"],
          "answer_index": 0,
          "hint": "short hint",
          "explanation": "short explanation after answer",
          "difficulty": "easy|medium|hard"
        }}
      ]
    }}
  ]
}}

Flashcards:
{cards_json}
"""
)


def _parse_json_object(content: str) -> dict:
    cleaned = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start:end + 1])
    return {}


@router.post("/campaign/{deck_id}/start", response_model=GameStartResponse)
async def start_campaign(deck_id: int, payload: GameStartRequest, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    cards = game_service.get_campaign_cards(session, deck_id, payload.card_count)
    if len(cards) < 2:
        raise HTTPException(status_code=422, detail="Deck cần ít nhất 2 thẻ để chơi Adventure Campaign.")

    compact_cards = [
        {
            "id": c["id"],
            "front": c.get("front"),
            "back": c.get("back"),
            "difficulty": c.get("difficulty"),
            "source_context": (c.get("source_context") or "")[:500],
        }
        for c in cards
    ]

    raw_campaign: dict = {}
    try:
        llm = get_llm()
        response = await (CAMPAIGN_PROMPT | llm).ainvoke({
            "cards_json": json.dumps(compact_cards, ensure_ascii=False),
        })
        raw_campaign = _parse_json_object(response.content)
    except Exception:
        raw_campaign = {}

    campaign = game_service.normalize_campaign(raw_campaign, cards)
    try:
        game = game_service.create_game_session(session, user_id, deck_id, campaign)
    except ProgrammingError as exc:
        session.rollback()
        raise HTTPException(
            status_code=503,
            detail="Thiếu bảng game_sessions. Chạy migration: ./.venv/bin/alembic upgrade head",
        ) from exc
    return {"session_id": game.id, "campaign": campaign}


@router.post("/campaign/{session_id}/complete", response_model=GameCompleteResponse)
def complete_campaign(session_id: int, payload: GameCompleteRequest, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    game = game_service.complete_game_session(
        session=session,
        session_id=session_id,
        user_id=user_id,
        score=payload.score,
        xp_earned=payload.xp_earned,
        accuracy=payload.accuracy,
        total_questions=payload.total_questions,
        correct_answers=payload.correct_answers,
    )
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy game session.")
    return {
        "session_id": game.id,
        "status": game.status,
        "score": game.score,
        "xp_earned": game.xp_earned,
        "accuracy": game.accuracy,
    }


@router.get("/sessions", response_model=list[GameSessionSummary])
def list_sessions(limit: int = 10, user_id: int = Depends(get_current_user_id), session: Session = Depends(get_session)):
    return game_service.list_game_sessions(session, user_id, limit)
