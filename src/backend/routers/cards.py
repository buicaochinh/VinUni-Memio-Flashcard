import json
import os
import re
from pathlib import Path

from aiofiles import open as aio_open
from fastapi import APIRouter, File, UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from src import database as db
from src.sm2 import get_updated_sm2_values

router = APIRouter()


class ProgressUpdate(BaseModel):
    user_id: int
    card_id: int
    quality: int
    ease_factor: float
    repetition: int
    interval: int


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
    db.update_card_progress(payload.user_id, payload.card_id, interval, n, ef)
    return {"message": "Success"}


@router.post("/{deck_id}/generate")
async def generate_cards(deck_id: int, file: UploadFile = File(...)):
    data_dir = Path(__file__).resolve().parents[3] / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    temp_path = data_dir / f"temp_{file.filename}"

    async with aio_open(temp_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    try:
        loader = PyPDFLoader(str(temp_path))
        pages = loader.load_and_split()
        context = "\n".join([p.page_content for p in pages[:3]])

        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
        template = """Hãy tạo 5 flashcards từ nội dung sau.
CHỈ TRẢ VỀ DUY NHẤT 1 MẢNG JSON BẮT ĐẦU BẰNG [ NGAY DÒNG ĐẦU TIÊN VÀ KHÔNG KÈM TEXT.
(JSON format: [{{"front": "...", "back": "..."}}]).
Ngôn ngữ: Tiếng Việt. Nội dung: {context}"""
        prompt = PromptTemplate.from_template(template)
        chain = prompt | llm

        response = chain.invoke({"context": context})
        llm_content = response.content
        match = re.search(r"\[.*\]", llm_content, re.DOTALL)
        if match:
            clean_content = match.group(0)
        else:
            clean_content = llm_content.replace("```json", "").replace("```", "").strip()

        cards_data = json.loads(clean_content)

        for c in cards_data:
            db.add_flashcard(deck_id, c["front"], c["back"])

        return {"message": "Success", "generated": len(cards_data)}
    except Exception as e:
        return {"error": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
