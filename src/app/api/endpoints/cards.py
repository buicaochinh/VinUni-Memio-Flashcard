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
from sqlmodel import Session, select
from src.app.models.domain import Flashcard

import asyncio
from src.app.utils.card_pipeline import (
    get_pipeline_config, run_pipeline_filter
)

from src.app.utils.image_generator import enrich_cards_with_images
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

IMAGE CLASSIFICATION — for each card, also set these 2 fields:
- "image_type": one of "diagram" | "real_image" | null
  - "diagram": processes, cycles, timelines, comparisons, formulas with visual structure
  - "real_image": historical figures, landmarks, organisms, artifacts, maps, physical objects
  - null: pure definitions, abstract concepts, dates, numbers where image adds nothing
- "image_prompt": required when image_type is not null
  - diagram: JSON spec as string: {{"type":"cycle|timeline|comparison|blank","nodes":["A","B","C"],"hidden":[1,3],"edges":[["A","B"],["B","C"]]}}
  - real_image: short English prompt ≤ 20 words for DALL-E 3 (e.g. "Napoleon Bonaparte portrait, French emperor, early 19th century")

RETURN ONLY A JSON ARRAY STARTING WITH [ ON THE FIRST LINE, NO ADDITIONAL TEXT.
Format: [{{"front": "question", "back": "answer", "difficulty": "medium", "source_context": "excerpt", "image_type": "real_image", "image_prompt": "..."}}]

Content: {context}"""
)


IMAGE_CARD_PROMPT = PromptTemplate.from_template(
    """You are creating visual flashcards for a "picture-to-word" guessing game.

From the document below, identify up to {count} concepts that can be VIVIDLY ILLUSTRATED with a single image.

CLASSIFY BROADLY — lean toward assigning an image when in doubt:
- "real_image": people (historical, scientific, political, cultural, religious), places (cities, buildings, landscapes, battlefields), objects (tools, weapons, vehicles, devices, food, clothing), living things (animals, plants, microbes, organs, cells), artworks, maps, flags, symbols, chemical structures, physical phenomena (lightning, eclipse, erosion)
- "diagram": any process or system with steps/stages (cycles, workflows, reactions, circuits), timelines, comparisons/contrasts, hierarchies, anatomical cross-sections, flowcharts, cause-effect chains, before/after, distribution maps

SKIP only: pure abstract math formulas with no visual form, or concepts where any image would be misleading.

For each concept create a flashcard:
- "front": short visual cue question in the document's language ("Đây là ai?", "Đây là gì?", "Quá trình này tên gì?")
- "back": concise answer (name / term), 1–4 words
- "difficulty": "easy" | "medium" | "hard"
- "source_context": one-sentence excerpt from the document
- "image_type": "real_image" | "diagram"
- "image_prompt":
    real_image → English description ≤ 15 words, specific and concrete, no text in image
    diagram    → JSON string: {{"type":"cycle|timeline|comparison","nodes":["A","B","C"],"edges":[["A","B"]]}}

LANGUAGE: Use the document's language for front / back / source_context.
QUALITY OVER QUANTITY: generate fewer cards if the document lacks visual concepts.

RETURN ONLY A JSON ARRAY STARTING WITH [
Format: [{{"front":"...","back":"...","difficulty":"medium","source_context":"...","image_type":"real_image","image_prompt":"..."}}]

Document:
{context}"""
)


def _parse_llm_json(content: str) -> list[dict]:
    # Try greedy first: handles nested ] inside diagram JSON specs in string values.
    # Non-greedy would stop at the first ] found inside a nested value and truncate.
    for pattern in (r"\[.*\]", r"\[.*?\]"):
        match = re.search(pattern, content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                continue
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


_IMAGE_CLASSIFY_PROMPT = PromptTemplate.from_template(
    """For each flashcard below, decide if a visual image would genuinely help learning.

Classify as:
- "real_image": historical figures, landmarks, organisms, physical objects, artifacts, maps
- "diagram": processes, cycles, timelines, comparisons, formulas with visual structure
- null: pure definitions, abstract concepts, dates, numbers — skip these

Return ONLY a JSON array. Only include cards where image_type is NOT null.
Format: [{{"idx": 0, "image_type": "real_image", "image_prompt": "English prompt ≤ 20 words for DALL-E"}}]

Cards:
{cards_text}"""
)


async def _classify_cards_for_images(cards: list[Flashcard]) -> list[dict]:
    """LLM phân loại cards nào cần ảnh. Trả về list dict có idx, image_type, image_prompt."""
    if not cards:
        return []
    cards_text = "\n".join(
        f"{i}. FRONT: {c.front[:120]}" for i, c in enumerate(cards)
    )
    llm = get_llm()
    try:
        response = await (_IMAGE_CLASSIFY_PROMPT | llm).ainvoke({"cards_text": cards_text})
        print(f"[IMG_CLASSIFY] raw response: {response.content[:300]}")
        result = _parse_llm_json(response.content)
        print(f"[IMG_CLASSIFY] parsed {len(result)} items: {result[:3]}")
        return result
    except Exception as e:
        print(f"[IMG_CLASSIFY] ERROR: {e}")
        return []


@router.post("/{deck_id}/generate_images")
async def generate_deck_images(deck_id: int, session: Session = Depends(get_session)):
    all_cards = session.exec(select(Flashcard).where(Flashcard.deck_id == deck_id)).all()
    unimaged = [c for c in all_cards if not c.image_url]
    print(f"[GEN_IMAGES] deck={deck_id} total={len(all_cards)} unimaged={len(unimaged)}")

    if not unimaged:
        return {"generated": 0, "total_candidates": 0, "skipped": "all cards already have images"}

    pre_classified = [c for c in unimaged if c.image_type == "real_image"]
    unclassified = [c for c in unimaged if c.image_type != "real_image"]
    print(f"[GEN_IMAGES] pre_classified={len(pre_classified)} unclassified={len(unclassified)}")

    newly_classified: list[dict] = []
    if unclassified:
        batches = [unclassified[i:i+40] for i in range(0, len(unclassified), 40)]
        for batch in batches:
            results = await _classify_cards_for_images(batch)
            for r in results:
                idx = r.get("idx")
                # LLM đôi khi trả string "0" thay vì int 0
                try:
                    idx = int(idx)
                except (TypeError, ValueError):
                    continue
                if idx >= len(batch):
                    continue
                card = batch[idx]
                image_type = r.get("image_type")
                image_prompt = r.get("image_prompt", "")
                if image_type in ("real_image", "diagram"):
                    card.image_type = image_type
                    if image_type == "diagram":
                        card.diagram_spec = image_prompt
                    session.add(card)
                if image_type == "real_image" and image_prompt:
                    newly_classified.append({
                        "image_type": "real_image",
                        "image_prompt": image_prompt,
                        "_id": card.id,
                    })
        session.commit()
        print(f"[GEN_IMAGES] newly_classified real_image={len(newly_classified)}")

    dall_e_candidates = [
        {"image_type": "real_image", "image_prompt": c.front[:80], "_id": c.id}
        for c in pre_classified
    ] + newly_classified
    print(f"[GEN_IMAGES] dall_e_candidates={len(dall_e_candidates)}")

    if not dall_e_candidates:
        return {"generated": 0, "total_candidates": 0, "classified_by_llm": len(newly_classified)}

    enriched = await enrich_cards_with_images(dall_e_candidates)

    generated = 0
    for item in enriched:
        url = item.get("image_url")
        print(f"[GEN_IMAGES] card _id={item.get('_id')} image_url={url}")
        if url:
            card = session.get(Flashcard, item["_id"])
            if card:
                card.image_url = url
                session.add(card)
                generated += 1

    session.commit()
    print(f"[GEN_IMAGES] done generated={generated}/{len(dall_e_candidates)}")
    return {
        "generated": generated,
        "total_candidates": len(dall_e_candidates),
        "classified_by_llm": len(newly_classified),
    }


@router.post("/{deck_id}/generate_image_cards")
async def generate_image_cards(
    deck_id: int,
    files: list[UploadFile] = File(...),
    count: int = Form(default=15),
    session: Session = Depends(get_session),
):
    print(f"[GEN_IMAGE_CARDS] called deck_id={deck_id} count={count} files={[f.filename for f in files]}")
    if count < 1:
        count = 1
    if count > 20:
        count = 20

    data_dir = Path(__file__).resolve().parents[4] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    all_pages = []
    load_errors = []
    for file in files:
        temp_path = data_dir / f"imgcard_{deck_id}_{file.filename}"
        file_bytes = await file.read()
        print(f"[GEN_IMAGE_CARDS] file={file.filename} size={len(file_bytes)} bytes")
        async with aio_open(temp_path, "wb") as out:
            await out.write(file_bytes)
        try:
            pages, _ = await _load_document_context(temp_path)
            print(f"[GEN_IMAGE_CARDS] loaded {len(pages)} pages from {file.filename}")
            all_pages.extend(pages)
        except Exception as load_err:
            print(f"[GEN_IMAGE_CARDS] load error for {file.filename}: {load_err}")
            load_errors.append(str(load_err))
        finally:
            if temp_path.exists():
                temp_path.unlink()

    print(f"[GEN_IMAGE_CARDS] total pages={len(all_pages)} load_errors={load_errors}")
    if not all_pages:
        detail = f"Không trích xuất được text từ file. Lỗi: {'; '.join(load_errors)}" if load_errors else "Không trích xuất được text từ file."
        raise HTTPException(status_code=422, detail=detail)

    # Single LLM call — take up to 8000 chars to keep context rich
    context = "\n\n".join(p.page_content for p in all_pages)[:8000]
    print(f"[GEN_IMAGE_CARDS] context len={len(context)} chars, calling LLM...")
    llm = get_llm()
    try:
        response = await (IMAGE_CARD_PROMPT | llm).ainvoke({"context": context, "count": count})
        raw_cards = _parse_llm_json(response.content)
        print(f"[GEN_IMAGE_CARDS] LLM returned {len(raw_cards)} raw cards")
    except Exception as e:
        print(f"[GEN_IMAGE_CARDS] LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM error: {e}") from e

    # Keep only cards that have a valid image_type
    visual_cards = [
        c for c in raw_cards
        if isinstance(c, dict) and c.get("image_type") in ("real_image", "diagram")
    ][:count]
    print(f"[GEN_IMAGE_CARDS] visual_cards={len(visual_cards)} (raw={len(raw_cards)})")

    if not visual_cards:
        raise HTTPException(status_code=422, detail="LLM không tìm thấy khái niệm nào có thể minh hoạ bằng ảnh trong tài liệu này.")

    # Generate DALL-E images for real_image cards
    enriched = await enrich_cards_with_images(visual_cards)

    # Save all visual cards (with or without image_url) to deck
    card_service.bulk_add_flashcards(session, deck_id, enriched)

    real_image_count = sum(1 for c in enriched if c.get("image_type") == "real_image")
    diagram_count = sum(1 for c in enriched if c.get("image_type") == "diagram")

    return {
        "saved": len(enriched),
        "real_image": real_image_count,
        "diagram": diagram_count,
    }


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
