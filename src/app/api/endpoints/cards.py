import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from aiofiles import open as aio_open
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, Depends
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from sqlmodel import Session

import asyncio
from src.app.utils.card_pipeline import (
    get_pipeline_config, run_pipeline_filter
)

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

def get_llm():
    raw_key = os.getenv("OPENAI_API_KEY")
    api_key = raw_key.strip() if raw_key else ""
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY chưa được cấu hình trong .env")

    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        openai_api_key=api_key,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CARD_PROMPT = PromptTemplate.from_template(
    """Create {count} high-quality academic flashcards from the content below.
Extract important concepts, definitions, entities, and processes from ACADEMIC CONTENT.

SKIP the following information in books/academic documents (do not create flashcards from them):
- Author names, translators, editors
- Publishers, publication year, publication address
- ISBN, book codes, copyright, acknowledgments
- Table of contents, preface, administrative introductions
- Headers, footers, page numbers, watermarks

Each card needs a clear question and accurate, concise answer.
Difficulty classification: "easy" (easy to remember), "medium" (needs practice), "hard" (complex).

LANGUAGE REQUIREMENT - CRITICAL:
- Detect the primary language of the document content
- Use ONLY that language consistently for ALL flashcards
- If content is in Chinese (中文/繁體中文/简体中文), generate ALL cards in Chinese
- If content is in Vietnamese, generate ALL cards in Vietnamese
- If content is in English, generate ALL cards in English
- Do NOT mix languages within a card or between cards
- Preserve original terminology and proper nouns in their original language

RETURN ONLY A JSON ARRAY STARTING WITH [ ON THE FIRST LINE, NO ADDITIONAL TEXT.
Format: [{{"front": "question", "back": "answer", "difficulty": "medium", "source_context": "short excerpt from original content used to create this card"}}]

Content: {context}"""
)


def _parse_llm_json(content: str) -> list[dict]:
    # Try non-greedy match first to avoid capturing extra text
    match = re.search(r"\[.*?\]", content, re.DOTALL)
    if not match:
        # Fallback: try greedy if non-greedy fails
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
    cfg = get_pipeline_config(target_count)

    # Zone SMALL — 1 call duy nhất
    if target_count <= 50:
        llm = get_llm()
        context = "\n\n".join(p.page_content for p in pages)[:8000]
        response = await (CARD_PROMPT | llm).ainvoke({
            "context": context,
            "count": target_count
        })
        return _parse_llm_json(response.content)[:target_count]

    # Zone MEDIUM + LARGE — parallel async
    chunk_size = 4
    chunks = [pages[i:i + chunk_size] for i in range(0, len(pages), chunk_size)]

    # Phân phối đều generate_count vào các chunks, tối thiểu cfg.cards_per_chunk,
    # tối đa 50 để tránh LLM trả JSON quá dài bị truncate
    generate_count = int(target_count * cfg.overflow_ratio)
    n_chunks = max(len(chunks), 1)
    cards_per_chunk = min(
        max(-(-generate_count // n_chunks), cfg.cards_per_chunk),
        50
    )

    sem = asyncio.Semaphore(cfg.semaphore_limit)

    async def process_chunk(chunk):
        async with sem:
            context = "\n\n".join(p.page_content for p in chunk)[:5000]
            llm = get_llm()
            r = await (CARD_PROMPT | llm).ainvoke({
                "context": context,
                "count": cards_per_chunk
            })
            return _parse_llm_json(r.content)

    results = await asyncio.gather(
        *[process_chunk(c) for c in chunks],
        return_exceptions=True
    )

    # Re-raise nếu toàn bộ chunks đều thất bại (không im lặng trả [])
    if not any(isinstance(r, list) for r in results):
        first_error = next((r for r in results if isinstance(r, Exception)), None)
        if first_error:
            raise first_error

    all_cards = [
        c for batch in results
        if isinstance(batch, list)
        for c in batch
    ]

    # Filter pipeline
    filtered = run_pipeline_filter(all_cards, cfg)

    # Fallback nới lỏng nếu thiếu cards sau filter
    if len(filtered) < target_count and len(all_cards) > len(filtered):
        from src.app.utils.card_pipeline import exact_dedup, prefilter
        relaxed = exact_dedup([c for c in all_cards if prefilter(c)])
        filtered = relaxed

    return filtered[:target_count]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/{deck_id}")
def get_cards(deck_id: int, user_id: int, session: Session = Depends(get_session)):
    cards = card_service.get_deck_cards(session, deck_id, user_id)
    return {"cards": cards}

@router.get("/{deck_id}/smart-queue")
def get_smart_queue(deck_id: int, user_id: int, override_limit: bool = False, session: Session = Depends(get_session)):
    cards = card_service.get_daily_study_queue(session, deck_id, user_id, override_limit)
    return {"cards": cards}

@router.get("/{deck_id}/study-summary")
def get_study_summary(deck_id: int, user_id: int, session: Session = Depends(get_session)):
    summary = card_service.get_study_summary(session, deck_id, user_id)
    return summary


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
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "429" in str(e):
            if "invalid" in err or "new_api_error" in err:
                raise HTTPException(status_code=503, detail="API key không hợp lệ hoặc hết credit. Kiểm tra OPENAI_API_KEY trong file .env") from e
            raise HTTPException(status_code=429, detail="API đang bị giới hạn tốc độ. Vui lòng đợi 2 phút rồi thử lại.") from e
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
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "429" in str(e):
            if "invalid" in err or "new_api_error" in err:
                raise HTTPException(status_code=503, detail="API key không hợp lệ hoặc hết credit. Kiểm tra OPENAI_API_KEY trong file .env") from e
            raise HTTPException(status_code=429, detail="API đang bị giới hạn tốc độ. Vui lòng đợi 2 phút rồi thử lại.") from e
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


EXPLAIN_PROMPT_INITIAL = PromptTemplate.from_template(
    """Bạn là một gia sư AI thân thiện, giúp học sinh hiểu rõ hơn về kiến thức trong flashcard này.
Grounding: Hãy dựa vào nội dung gốc (Source Context) bên dưới để giải thích chính xác.

Source Context: {source_context}

Flashcard:
- Câu hỏi: {front}
- Đáp án: {back}

NHIỆM VỤ: Tự động giải thích flashcard này dựa trên tài liệu nguồn (Source Context). Giải thích chi tiết về:
- Khái niệm chính trong câu hỏi và đáp án
- Ngữ cảnh và ý nghĩa của kiến thức này
- Các điểm quan trọng cần lưu ý

YÊU CẦU:
1. Giải thích chi tiết, chuyên sâu và dễ hiểu dựa trên Source Context.
2. Sử dụng các trích dẫn [1], [2],... ngay sau các thông tin quan trọng được trích lục hoặc tóm tắt từ Source Context.
3. Trả về kết quả dưới dạng JSON DUY NHẤT với cấu trúc:
{{
  "answer": "Nội dung giải thích (Markdown) có kèm các trích dẫn [1], [2]...",
  "citations": [
    {{ "id": 1, "text": "Tóm tắt ngắn gọn ý của trích dẫn 1", "source": "Câu văn/Đoạn văn gốc chính xác từ Source Context" }}
  ]
}}
CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH GÌ THÊM BÊN NGOÀI."""
)

EXPLAIN_PROMPT_FOLLOWUP = PromptTemplate.from_template(
    """Bạn là một gia sư AI thân thiện, giúp học sinh hiểu rõ hơn về kiến thức trong flashcard này.
Grounding: Hãy dựa vào nội dung gốc (Source Context) bên dưới để giải thích chính xác.
Scope: Chỉ trả lời các câu hỏi liên quan trực tiếp đến flashcard, đáp án, Source Context, hoặc cách học/hiểu kiến thức trong thẻ này.
Nếu câu hỏi nằm ngoài phạm vi đó (ví dụ: hỏi quán ăn, thời tiết, giải trí, lập trình, việc cá nhân không liên quan), hãy từ chối ngắn gọn và kéo người học về nội dung thẻ.

Source Context: {source_context}

Flashcard:
- Câu hỏi: {front}
- Đáp án: {back}

Lịch sử trò chuyện:
{history}

Câu hỏi của học sinh: {message}

YÊU CẦU:
1. Trước hết tự kiểm tra câu hỏi có liên quan trực tiếp đến thẻ hay không.
2. Nếu KHÔNG liên quan, trả về JSON DUY NHẤT:
{{
  "answer": "Mình chỉ hỗ trợ giải thích nội dung trong flashcard này. Bạn có thể hỏi về khái niệm, đáp án, ví dụ, hoặc phần nào chưa rõ trong thẻ.",
  "citations": [],
  "out_of_scope": true
}}
3. Nếu liên quan, trả lời câu hỏi của học sinh dựa trên Source Context.
4. Giải thích chi tiết, chuyên sâu và dễ hiểu.
5. Sử dụng các trích dẫn [1], [2],... ngay sau các thông tin quan trọng được trích lục hoặc tóm tắt từ Source Context.
6. Không bịa thêm thông tin ngoài Source Context. Nếu Source Context không đủ, nói rõ giới hạn đó.
7. Trả về kết quả dưới dạng JSON DUY NHẤT với cấu trúc:
{{
  "answer": "Nội dung giải thích (Markdown) có kèm các trích dẫn [1], [2]...",
  "citations": [
    {{ "id": 1, "text": "Tóm tắt ngắn gọn ý của trích dẫn 1", "source": "Câu văn/Đoạn văn gốc chính xác từ Source Context" }}
  ]
}}
CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH GÌ THÊM BÊN NGOÀI."""
)


OUT_OF_SCOPE_EXPLAIN_RESPONSE = {
    "answer": "Mình chỉ hỗ trợ giải thích nội dung trong flashcard này. Bạn có thể hỏi về khái niệm, đáp án, ví dụ, hoặc phần nào chưa rõ trong thẻ.",
    "citations": [],
    "out_of_scope": True,
}


def _is_obviously_out_of_scope(message: str) -> bool:
    text = message.lower()
    blocked_phrases = (
        "quán ăn",
        "nhà hàng",
        "đặt bàn",
        "giao đồ ăn",
        "ăn gì ở",
        "gợi ý quán",
        "thời tiết",
        "dự báo",
        "xem phim",
        "bài hát",
        "du lịch",
        "khách sạn",
        "vé máy bay",
        "viết code",
        "lập trình",
        "chứng khoán",
        "crypto",
        "restaurant",
        "weather",
        "movie",
        "hotel",
        "flight",
        "stock",
        "bitcoin",
    )
    return any(phrase in text for phrase in blocked_phrases)

@router.post("/explain")
def get_explain(payload: ExplainRequest):
    llm = get_llm()
    source_context = (payload.source_context or "").strip() or "Flashcard content."

    # Check if this is the initial system prompt (empty message and no history)
    is_initial = not payload.message.strip() and len(payload.history) == 0

    if is_initial:
        # Use initial prompt - system automatically explains the flashcard
        chain = EXPLAIN_PROMPT_INITIAL | llm
        response = chain.invoke({
            "front": payload.front,
            "back": payload.back,
            "source_context": source_context
        })
    else:
        if _is_obviously_out_of_scope(payload.message):
            return OUT_OF_SCOPE_EXPLAIN_RESPONSE

        # Use follow-up prompt - respond to user's question
        history_text = "\n".join([f"{msg.get('role', 'user')}: {msg.get('text', '')}" for msg in payload.history])
        chain = EXPLAIN_PROMPT_FOLLOWUP | llm
        response = chain.invoke({
            "front": payload.front,
            "back": payload.back,
            "source_context": source_context,
            "history": history_text,
            "message": payload.message
        })

    # Try to parse as JSON
    content = response.content
    try:
        # If it's wrapped in markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        return json.loads(content)
    except:
        return {"answer": response.content, "citations": []}
