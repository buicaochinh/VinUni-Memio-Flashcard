import json
import random
from typing import Any

from sqlmodel import Session, select

from src.app.models.domain import Flashcard, GameSession
from src.app.core.time import utc_now_naive


def _safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _fallback_campaign(cards: list[dict]) -> dict:
    selected = cards[:12]
    if not selected:
        return {
            "title": "Memory Trail",
            "premise": "Một hành trình ngắn để kiểm tra lại những gì bạn vừa học.",
            "final_goal": "Hoàn thành các trạm kiến thức và ghi lại điểm yếu cần ôn tiếp.",
            "stages": [],
        }

    stage_count = min(3, max(1, len(selected)))
    stages: list[dict] = []
    for stage_idx in range(stage_count):
        stage_cards = selected[stage_idx::stage_count]
        questions: list[dict] = []
        for q_idx, card in enumerate(stage_cards):
            wrong_pool = [
                _safe_text(c.get("back"))
                for c in selected
                if c.get("id") != card.get("id") and _safe_text(c.get("back"))
            ]
            random.shuffle(wrong_pool)
            answer = _safe_text(card.get("back"), "Đáp án đúng")
            choices = [answer] + wrong_pool[:3]
            while len(choices) < 4:
                choices.append("Chưa đủ dữ kiện trong deck")
            random.shuffle(choices)
            questions.append({
                "id": f"s{stage_idx + 1}-q{q_idx + 1}",
                "card_id": card["id"],
                "stage_id": f"stage-{stage_idx + 1}",
                "prompt": _safe_text(card.get("front"), "Câu hỏi"),
                "choices": choices,
                "answer_index": choices.index(answer),
                "hint": _safe_text(card.get("source_context"), "Nhớ lại ý chính trong mặt trước của thẻ.")[:220],
                "explanation": answer,
                "difficulty": card.get("difficulty") or "medium",
            })
        stages.append({
            "id": f"stage-{stage_idx + 1}",
            "title": f"Chặng {stage_idx + 1}",
            "mission": "Vượt qua cụm câu hỏi này để mở tiếp bản đồ kiến thức.",
            "questions": questions,
        })

    return {
        "title": "Memory Trail",
        "premise": "Bạn đi qua một bản đồ kiến thức được dựng từ deck này. Mỗi câu đúng giúp mở thêm một đoạn đường.",
        "final_goal": "Hoàn thành toàn bộ chặng và nhận báo cáo điểm mạnh, điểm yếu.",
        "stages": stages,
    }


def get_campaign_cards(session: Session, deck_id: int, limit: int) -> list[dict]:
    statement = (
        select(Flashcard)
        .where(Flashcard.deck_id == deck_id)
        .order_by(Flashcard.created_at.asc())
        .limit(max(4, min(limit, 20)))
    )
    cards = session.exec(statement).all()
    return [c.model_dump() for c in cards]


def normalize_campaign(raw: Any, cards: list[dict]) -> dict:
    fallback = _fallback_campaign(cards)
    if not isinstance(raw, dict):
        return fallback

    card_by_id = {int(c["id"]): c for c in cards if c.get("id") is not None}
    stages = raw.get("stages")
    if not isinstance(stages, list) or not stages:
        return fallback

    normalized_stages: list[dict] = []
    used_question_ids: set[str] = set()
    for stage_idx, stage in enumerate(stages[:4]):
        if not isinstance(stage, dict):
            continue
        questions = []
        for q_idx, question in enumerate((stage.get("questions") or [])[:6]):
            if not isinstance(question, dict):
                continue
            try:
                card_id = int(question.get("card_id"))
            except (TypeError, ValueError):
                continue
            if card_id not in card_by_id:
                continue
            choices = question.get("choices")
            if not isinstance(choices, list):
                continue
            choices = [_safe_text(c) for c in choices if _safe_text(c)]
            if len(choices) < 2:
                continue
            choices = choices[:4]
            answer_index = question.get("answer_index")
            if not isinstance(answer_index, int) or answer_index < 0 or answer_index >= len(choices):
                answer_index = 0
            while len(choices) < 4:
                choices.append("Chưa đủ dữ kiện trong deck")

            qid = _safe_text(question.get("id"), f"s{stage_idx + 1}-q{q_idx + 1}")
            if qid in used_question_ids:
                qid = f"{qid}-{q_idx + 1}"
            used_question_ids.add(qid)
            questions.append({
                "id": qid,
                "card_id": card_id,
                "stage_id": _safe_text(stage.get("id"), f"stage-{stage_idx + 1}"),
                "prompt": _safe_text(question.get("prompt"), card_by_id[card_id].get("front") or "Câu hỏi"),
                "choices": choices,
                "answer_index": answer_index,
                "hint": _safe_text(question.get("hint"), "Nhìn lại ngữ cảnh nguồn của thẻ này."),
                "explanation": _safe_text(question.get("explanation"), card_by_id[card_id].get("back") or "Đáp án đúng"),
                "difficulty": _safe_text(question.get("difficulty"), card_by_id[card_id].get("difficulty") or "medium"),
            })

        if questions:
            normalized_stages.append({
                "id": _safe_text(stage.get("id"), f"stage-{stage_idx + 1}"),
                "title": _safe_text(stage.get("title"), f"Chặng {stage_idx + 1}"),
                "mission": _safe_text(stage.get("mission"), "Hoàn thành chặng này để mở tiếp bản đồ kiến thức."),
                "questions": questions,
            })

    if not normalized_stages:
        return fallback

    return {
        "title": _safe_text(raw.get("title"), fallback["title"]),
        "premise": _safe_text(raw.get("premise"), fallback["premise"]),
        "final_goal": _safe_text(raw.get("final_goal"), fallback["final_goal"]),
        "stages": normalized_stages,
    }


def create_game_session(session: Session, user_id: int, deck_id: int, campaign: dict) -> GameSession:
    total_questions = sum(len(stage.get("questions", [])) for stage in campaign.get("stages", []))
    game = GameSession(
        user_id=user_id,
        deck_id=deck_id,
        campaign_json=json.dumps(campaign, ensure_ascii=False),
        total_questions=total_questions,
    )
    session.add(game)
    session.commit()
    session.refresh(game)
    return game


def complete_game_session(
    session: Session,
    session_id: int,
    user_id: int,
    score: int,
    xp_earned: int,
    accuracy: float,
    total_questions: int,
    correct_answers: int,
) -> GameSession | None:
    statement = select(GameSession).where(GameSession.id == session_id, GameSession.user_id == user_id)
    game = session.exec(statement).first()
    if not game:
        return None
    game.status = "completed"
    game.score = max(0, score)
    game.xp_earned = max(0, xp_earned)
    game.accuracy = max(0, min(100, accuracy))
    game.total_questions = max(0, total_questions)
    game.correct_answers = max(0, correct_answers)
    game.completed_at = utc_now_naive()
    session.add(game)
    session.commit()
    session.refresh(game)
    return game


def list_game_sessions(session: Session, user_id: int, limit: int = 10) -> list[GameSession]:
    statement = (
        select(GameSession)
        .where(GameSession.user_id == user_id)
        .order_by(GameSession.created_at.desc())
        .limit(max(1, min(limit, 50)))
    )
    return list(session.exec(statement).all())
