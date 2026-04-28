import hashlib
import re
from dataclasses import dataclass

from datasketch import MinHash, MinHashLSH


@dataclass
class PipelineConfig:
    overflow_ratio: float
    semaphore_limit: int
    cards_per_chunk: int
    use_exact_dedup: bool
    use_semantic_dedup: bool
    min_quality_score: float
    use_prompt_cache: bool


def get_pipeline_config(count: int) -> PipelineConfig:
    if count <= 50:
        return PipelineConfig(
            overflow_ratio=1.0,
            semaphore_limit=1,
            cards_per_chunk=count,
            use_exact_dedup=False,
            use_semantic_dedup=False,
            min_quality_score=0.0,
            use_prompt_cache=False,
        )
    elif count <= 150:
        return PipelineConfig(
            overflow_ratio=1.15,
            semaphore_limit=5,
            cards_per_chunk=30,
            use_exact_dedup=True,
            use_semantic_dedup=False,
            min_quality_score=0.4,
            use_prompt_cache=True,
        )
    else:
        return PipelineConfig(
            overflow_ratio=1.30,
            semaphore_limit=10,
            cards_per_chunk=40,
            use_exact_dedup=True,
            use_semantic_dedup=True,
            min_quality_score=0.4,
            use_prompt_cache=True,
        )


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def prefilter(card: dict) -> bool:
    front = card.get("front", "") or ""
    back = card.get("back", "") or ""
    if len(front) < 10 or len(back) < 15:
        return False
    if len(back.split()) < 4:
        return False
    if _normalize(front) == _normalize(back):
        return False
    return True


def exact_dedup(cards: list[dict]) -> list[dict]:
    seen: set[str] = set()
    result = []
    for card in cards:
        key = hashlib.md5(_normalize(card.get("front", "")).encode()).hexdigest()
        if key not in seen:
            seen.add(key)
            result.append(card)
    return result


def semantic_dedup(cards: list[dict], threshold: float = 0.7) -> list[dict]:
    if not cards:
        return cards

    num_perm = 128
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
    minhashes = []

    for i, card in enumerate(cards):
        tokens = set(_normalize(card.get("front", "")).split())
        m = MinHash(num_perm=num_perm)
        for token in tokens:
            m.update(token.encode())
        minhashes.append(m)
        try:
            lsh.insert(str(i), m)
        except ValueError:
            pass

    removed: set[int] = set()
    for i, m in enumerate(minhashes):
        if i in removed:
            continue
        duplicates = lsh.query(m)
        for dup_key in duplicates:
            j = int(dup_key)
            if j != i and j not in removed:
                card_i = cards[i]
                card_j = cards[j]
                ctx_i = len(card_i.get("source_context") or "")
                ctx_j = len(card_j.get("source_context") or "")
                if ctx_j > ctx_i:
                    removed.add(i)
                    break
                elif ctx_i == ctx_j and len(card_j.get("back", "")) > len(card_i.get("back", "")):
                    removed.add(i)
                    break
                else:
                    removed.add(j)

    return [card for i, card in enumerate(cards) if i not in removed]


def _card_score(card: dict) -> float:
    front = card.get("front", "") or ""
    back = card.get("back", "") or ""
    front_words = front.split()
    back_words = back.split()
    score = 0.0

    if 5 <= len(front_words) <= 20:
        score += 0.3
    if 10 <= len(back_words) <= 80:
        score += 0.3
    if card.get("source_context"):
        score += 0.2

    question_indicators = {"?", "tại sao", "như thế nào", "khi nào", "how", "why", "when"}
    front_lower = front.lower()
    if any(ind in front_lower for ind in question_indicators):
        score += 0.15

    vague_words = {"gì", "what", "nêu", "describe", "là", "the"}
    all_words = [w.lower() for w in front_words + back_words]
    vague_count = sum(1 for w in all_words if w in vague_words)
    vague_ratio = vague_count / max(len(all_words), 1)
    score -= vague_ratio * 0.3

    return score


def quality_filter(cards: list[dict], min_score: float = 0.4) -> list[dict]:
    scored = [(card, _card_score(card)) for card in cards]
    filtered = [(card, s) for card, s in scored if s >= min_score]
    filtered.sort(key=lambda x: x[1], reverse=True)
    return [card for card, _ in filtered]


def run_pipeline_filter(cards: list[dict], cfg: PipelineConfig) -> list[dict]:
    cards = [c for c in cards if prefilter(c)]
    cards = exact_dedup(cards)
    if cfg.use_semantic_dedup:
        cards = semantic_dedup(cards)
    if cfg.min_quality_score > 0:
        cards = quality_filter(cards, cfg.min_quality_score)
    return cards
