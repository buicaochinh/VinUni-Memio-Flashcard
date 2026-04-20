import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from aiofiles import open as aio_open
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.prompts import PromptTemplate
from langchain_anthropic import ChatAnthropic
from sqlmodel import Session

from src.app.db.session import get_session
from src.app.services import card_service
from src.app.core.sm2 import get_updated_sm2_values
from src.app.schemas.card import (
    ProgressUpdate, 
    CardEdit, 
    BulkCreatePayload, 
    StudySessionLog, 
    ExplainRequest
)

# Load env immediately at module import
load_dotenv()

router = APIRouter()

# Model configurable via env var; default to gpt-3.5-turbo (proven to work)
_ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620")


def get_llm():
    raw_key = os.getenv("ANTHROPIC_API_KEY")
    api_key = raw_key.strip() if raw_key else ""

    return ChatAnthropic(
        model=_ANTHROPIC_MODEL,
        temperature=0.7,
        anthropic_api_key=api_key,
        base_url="https://api.shopaikey.com"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CARD_PROMPT = PromptTemplate.from_template(
    """Hãy tạo {count} flashcards học thuật chất lượng cao từ nội dung sau.
Trích xuất các khái niệm quan trọng, định nghĩa, thực thể và quy trình từ NỘI DUNG HỌC THUẬT.

BỎ QUA các thông tin sau với những tài liệu là sách/ tài liệu học thuật (không tạo flashcard từ chúng):
- Tên tác giả, dịch giả, biên tập viên
- Nhà xuất bản (NXB), năm xuất bản, địa chỉ xuất bản
- ISBN, mã số sách, bản quyền, lời cảm ơn
- Mục lục, lời tựa, lời giới thiệu mang tính hành chính
- Header, footer, số trang, watermark

Mỗi thẻ cần câu hỏi rõ ràng và câu trả lời chính xác, ngắn gọn.
Phân loại độ khó: "easy" (dễ nhớ), "medium" (cần luyện tập), "hard" (phức tạp).

NGÔN NGỮ: Xác định ngôn ngữ chính của tài liệu và dùng NHẤT QUÁN ngôn ngữ đó cho toàn bộ flashcards.
Không trộn lẫn ngôn ngữ trong cùng một thẻ hoặc giữa các thẻ.

CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON BẮT ĐẦU BẰNG [ NGAY DÒNG ĐẦU TIÊN, KHÔNG KÈM TEXT.
Format: [{{"front": "câu hỏi", "back": "câu trả lời", "difficulty": "medium"}}]

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
    llm = get_llm()
    chunk_size = 4
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
def get_cards(deck_id: int, user_id: int, session: Session = Depends(get_session)):
    cards = card_service.get_deck_cards(session, deck_id, user_id)
    return {"cards": cards}


@router.post("/progress")
def update_progress(payload: ProgressUpdate, session: Session = Depends(get_session)):
    card_data = {
        "ease_factor": payload.ease_factor,
        "repetition": payload.repetition,
        "interval": payload.interval,
    }
    interval, n, ef = get_updated_sm2_values(card_data, payload.quality)
    card_service.update_card_progress(
        session, payload.user_id, payload.card_id, interval, n, ef, payload.quality
    )
    return {"message": "success", "interval": interval, "ease_factor": ef}


@router.post("/session")
def log_session(payload: StudySessionLog, session: Session = Depends(get_session)):
    card_service.log_study_session(
        session, payload.user_id, payload.deck_id, payload.cards_reviewed, payload.avg_quality
    )
    return {"message": "success"}


@router.post("/{deck_id}/preview")
async def preview_cards(
    deck_id: int,
    files: list[UploadFile] = File(...),
    count: int = Form(default=100),
):
    data_dir = Path(__file__).resolve().parents[4] / "data"
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
        raise HTTPException(status_code=422, detail="Không trích xuất được text.")

    try:
        cards = await _generate_cards_chunked(all_pages, count)
        return {"cards": cards, "total": len(cards)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {e}") from e


@router.post("/{deck_id}/bulk_create")
def bulk_create_cards(deck_id: int, payload: BulkCreatePayload, session: Session = Depends(get_session)):
    card_service.bulk_add_flashcards(session, deck_id, payload.cards)
    return {"message": "success", "created": len(payload.cards)}


@router.post("/{deck_id}/generate")
async def generate_cards(
    deck_id: int,
    files: list[UploadFile] = File(...),
    count: int = Form(default=100),
    session: Session = Depends(get_session),
):
    data_dir = Path(__file__).resolve().parents[4] / "data"
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
        raise HTTPException(status_code=422, detail="Không trích xuất được text.")

    try:
        cards_data = await _generate_cards_chunked(all_pages, count)
        card_service.bulk_add_flashcards(session, deck_id, cards_data)
        return {"message": "success", "generated": len(cards_data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {e}") from e


@router.put("/{card_id}")
def update_card(card_id: int, payload: CardEdit, session: Session = Depends(get_session)):
    card_service.update_flashcard(session, card_id, payload.front, payload.back, payload.difficulty)
    return {"message": "success"}


@router.delete("/{card_id}")
def delete_card(card_id: int, session: Session = Depends(get_session)):
    card_service.delete_flashcard(session, card_id)
    return {"message": "success"}


@router.get("/{deck_id}/analytics")
def get_deck_analytics(deck_id: int, user_id: int, session: Session = Depends(get_session)):
    cards = card_service.get_deck_cards(session, deck_id, user_id)
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
