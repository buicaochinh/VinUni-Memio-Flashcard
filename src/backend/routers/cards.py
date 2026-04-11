import json
import os
import re
from pathlib import Path

from aiofiles import open as aio_open
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from src import database as db
from src.sm2 import get_updated_sm2_values

router = APIRouter()

# Model configurable via env var; default to gpt-3.5-turbo (proven to work)
_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")


def get_llm():
    return ChatOpenAI(model=_OPENAI_MODEL, temperature=0.7)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ProgressUpdate(BaseModel):
    user_id: int
    card_id: int
    quality: int
    ease_factor: float
    repetition: int
    interval: int
    deck_id: int = 0


class CardEdit(BaseModel):
    front: str
    back: str
    difficulty: str = "medium"


class BulkCreatePayload(BaseModel):
    cards: list[dict]


class StudySessionLog(BaseModel):
    user_id: int
    deck_id: int
    cards_reviewed: int
    avg_quality: float


class ExplainRequest(BaseModel):
    front: str
    back: str
    message: str
    history: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CARD_PROMPT = PromptTemplate.from_template(
    """Hãy tạo {count} flashcards học thuật chất lượng cao từ nội dung sau.
Trích xuất các khái niệm quan trọng, định nghĩa, thực thể và quy trình.
Mỗi thẻ cần câu hỏi rõ ràng và câu trả lời chính xác, ngắn gọn.
Phân loại độ khó: "easy" (dễ nhớ), "medium" (cần luyện tập), "hard" (phức tạp).

CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON BẮT ĐẦU BẰNG [ NGAY DÒNG ĐẦU TIÊN, KHÔNG KÈM TEXT.
Format: [{{"front": "câu hỏi", "back": "câu trả lời", "difficulty": "medium"}}]

Ngôn ngữ: Tiếng Việt (hoặc theo ngôn ngữ tài liệu gốc nếu khác tiếng Việt).
Nội dung: {context}"""
)


def _parse_llm_json(content: str) -> list[dict]:
    match = re.search(r"\[.*\]", content, re.DOTALL)
    if match:
        raw = match.group(0)
    else:
        raw = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(raw)
    except Exception:
        return []


async def _load_document_context(temp_path: Path, max_chars: int = 6000) -> tuple[list, str]:
    """Load Document pages and return (pages, combined_context)."""
    suffix = temp_path.suffix.lower()
    if suffix == '.pdf':
        loader = PyPDFLoader(str(temp_path))
    elif suffix == '.docx':
        loader = Docx2txtLoader(str(temp_path))
    elif suffix in ['.txt', '.md']:
        loader = TextLoader(str(temp_path), encoding='utf-8')
    else:
        return [], ""

    pages = loader.load_and_split()
    context = "\n\n".join(p.page_content for p in pages)[:max_chars]
    return pages, context


async def _generate_cards_chunked(pages: list, target_count: int) -> list[dict]:
    """Generate cards by chunking pages to approach target_count."""
    llm = get_llm()
    chunk_size = 4  # pages per chunk
    cards_per_chunk = max(8, min(30, target_count // max(1, len(pages) // chunk_size + 1)))

    all_cards: list[dict] = []
    chunks = [pages[i:i + chunk_size] for i in range(0, len(pages), chunk_size)]

    for chunk in chunks:
        if len(all_cards) >= target_count:
            break
        context = "\n\n".join(p.page_content for p in chunk)[:5000]
        prompt = CARD_PROMPT
        chain = prompt | llm
        response = chain.invoke({"context": context, "count": cards_per_chunk})
        chunk_cards = _parse_llm_json(response.content)
        all_cards.extend(chunk_cards)

    return all_cards[:target_count]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/{deck_id}")
def get_cards(deck_id: int, user_id: int):
    cards = db.get_deck_cards(deck_id, user_id)
    return {"cards": cards}


@router.post("/progress")
def update_progress(payload: ProgressUpdate):
    card_data = {
        "ease_factor": payload.ease_factor,
        "repetition": payload.repetition,
        "interval": payload.interval,
    }
    interval, n, ef = get_updated_sm2_values(card_data, payload.quality)
    db.update_card_progress(
        payload.user_id, payload.card_id, interval, n, ef, payload.quality
    )
    return {"message": "success", "interval": interval, "ease_factor": ef}


@router.post("/session")
def log_session(payload: StudySessionLog):
    db.log_study_session(
        payload.user_id, payload.deck_id, payload.cards_reviewed, payload.avg_quality
    )
    return {"message": "success"}


# Preview: generate cards WITHOUT saving to DB (for review/edit flow)
@router.post("/{deck_id}/preview")
async def preview_cards(
    deck_id: int,
    files: list[UploadFile] = File(...),
    count: int = Form(default=100),
):
    data_dir = Path(__file__).resolve().parents[3] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    all_pages = []

    for file in files:
        temp_path = data_dir / f"preview_{deck_id}_{file.filename}"
        async with aio_open(temp_path, "wb") as out:
            await out.write(await file.read())

        try:
            pages, _ = await _load_document_context(temp_path)
            all_pages.extend(pages)
        finally:
            if temp_path.exists():
                temp_path.unlink()

    if not all_pages:
        raise HTTPException(
            status_code=422,
            detail=(
                "Không trích xuất được text từ các file đã tải lên. "
                "Có thể file chứa ảnh scan hoặc định dạng không đúng."
            ),
        )

    try:
        cards = await _generate_cards_chunked(all_pages, count)

        if not cards:
            raise HTTPException(
                status_code=422,
                detail=(
                    "AI không tạo được flashcards từ nội dung này. "
                    "Hãy thử file khác hoặc kiểm tra OPENAI_API_KEY."
                ),
            )

        return {"cards": cards, "total": len(cards)}

    except HTTPException:
        raise  # re-raise without wrapping
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {e}") from e


# Bulk create: save reviewed/edited cards from preview to DB
@router.post("/{deck_id}/bulk_create")
def bulk_create_cards(deck_id: int, payload: BulkCreatePayload):
    db.bulk_add_flashcards(deck_id, payload.cards)
    return {"message": "success", "created": len(payload.cards)}


# Legacy generate endpoint (saves immediately, for compatibility)
@router.post("/{deck_id}/generate")
async def generate_cards(
    deck_id: int,
    files: list[UploadFile] = File(...),
    count: int = Form(default=100),
):
    data_dir = Path(__file__).resolve().parents[3] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    all_pages = []

    for file in files:
        temp_path = data_dir / f"temp_{deck_id}_{file.filename}"
        async with aio_open(temp_path, "wb") as out:
            await out.write(await file.read())

        try:
            pages, _ = await _load_document_context(temp_path)
            all_pages.extend(pages)
        finally:
            if temp_path.exists():
                temp_path.unlink()

    if not all_pages:
        raise HTTPException(status_code=422, detail="Không trích xuất được text từ các file đã tải lên.")

    try:
        cards_data = await _generate_cards_chunked(all_pages, count)
        if not cards_data:
            raise HTTPException(status_code=422, detail="AI không tạo được flashcards.")
        db.bulk_add_flashcards(deck_id, cards_data)
        return {"message": "success", "generated": len(cards_data)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {e}") from e


# Update a single card  (PUT /api/cards/{card_id})
@router.put("/{card_id}")
def update_card(card_id: int, payload: CardEdit):
    db.update_flashcard(card_id, payload.front, payload.back, payload.difficulty)
    return {"message": "success"}


# Delete a single card  (DELETE /api/cards/{card_id})
@router.delete("/{card_id}")
def delete_card(card_id: int):
    db.delete_flashcard(card_id)
    return {"message": "success"}


# Analytics for a deck: forgetting speed + hardest cards
@router.get("/{deck_id}/analytics")
def get_deck_analytics(deck_id: int, user_id: int):
    cards = db.get_deck_cards(deck_id, user_id)
    reviewed = [c for c in cards if c.get("repetition") and c["repetition"] > 0]

    hardest = sorted(reviewed, key=lambda c: c.get("ease_factor", 2.5))[:5]
    total = len(reviewed)
    hard_count = sum(1 for c in reviewed if (c.get("ease_factor") or 2.5) < 2.0)
    forgetting_rate = round(hard_count / total * 100, 1) if total else 0

    return {
        "hardest_cards": hardest,
        "forgetting_rate": forgetting_rate,
        "total_reviewed": total,
        "total_cards": len(cards),
    }


EXPLAIN_PROMPT = PromptTemplate.from_template(
    """Bạn là một gia sư AI thân thiện, giúp học sinh hiểu rõ hơn về flashcard này.
Flashcard:
- Câu hỏi: {front}
- Đáp án: {back}

Lịch sử trò chuyện:
{history}

Câu hỏi của học sinh: {message}"""
)

@router.post("/explain")
def get_explain(payload: ExplainRequest):
    llm = get_llm()
    history_text = "\n".join([f"{msg.get('role', 'user')}: {msg.get('text', '')}" for msg in payload.history])
    chain = EXPLAIN_PROMPT | llm
    response = chain.invoke({
        "front": payload.front, 
        "back": payload.back, 
        "history": history_text,
        "message": payload.message
    })
    return {"response": response.content}
