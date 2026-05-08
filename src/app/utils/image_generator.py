import asyncio
import logging
import os
import uuid
from pathlib import Path

import httpx

from src.app.core.config import settings

logger = logging.getLogger(__name__)

# Save images to frontend/public/generated-images/ so Next.js serves them as static assets
_IMAGES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "generated-images"


async def _download_and_save(url: str) -> str | None:
    """Download image from a temporary URL and save locally. Returns permanent relative URL."""
    _IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.png"
    dest = _IMAGES_DIR / filename
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url)
            r.raise_for_status()
            dest.write_bytes(r.content)
        return f"/generated-images/{filename}"
    except Exception as e:
        logger.error("Failed to download/save DALL-E image: %s", e)
        return None


async def generate_real_image_async(prompt: str) -> str | None:
    if not settings.OPENAI_IMAGE_ENABLED:
        logger.info("DALL-E skipped: OPENAI_IMAGE_ENABLED=False")
        return None
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        logger.warning("DALL-E skipped: OPENAI_API_KEY is empty")
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        response = await client.images.generate(
            model="dall-e-3",
            prompt=f"Educational illustration, clean style, no text: {prompt}",
            size="1024x1024",
            quality="standard",
            n=1,
        )
        temp_url = response.data[0].url
        if not temp_url:
            return None
        permanent_url = await _download_and_save(temp_url)
        return permanent_url
    except Exception as e:
        logger.error("DALL-E error for prompt %r: %s", prompt[:60], e)
        return None


async def enrich_cards_with_images(cards: list[dict]) -> list[dict]:
    real_image_indices = [
        i for i, c in enumerate(cards)
        if c.get("image_type") == "real_image" and c.get("image_prompt")
    ]
    if not real_image_indices:
        return cards

    sem = asyncio.Semaphore(3)

    async def fetch(idx: int):
        async with sem:
            prompt = cards[idx]["image_prompt"]
            url = await generate_real_image_async(prompt)
            if url:
                cards[idx]["image_url"] = url

    await asyncio.gather(*[fetch(i) for i in real_image_indices])
    return cards
