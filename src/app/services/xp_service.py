from sqlmodel import Session, select
from src.app.models.domain import User

# (level, name, min_xp_to_reach)
LEVELS = [
    (1,  "Tân Binh",    0),
    (2,  "Học Viên",    100),
    (3,  "Chiến Binh",  250),
    (4,  "Hiệp Sĩ",     500),
    (5,  "Học Giả",     900),
    (6,  "Thạc Sĩ",     1_400),
    (7,  "Đại Sư",      2_000),
    (8,  "Huyền Thoại", 2_800),
    (9,  "Thần Học",    3_800),
    (10, "Vĩ Nhân",     5_000),
]

XP_PER_CARD_REVIEWED = 2
XP_PER_GAME_XP = 1  # game xp_earned is already computed by client; we trust it 1:1


def compute_level(total_xp: int) -> dict:
    current = LEVELS[0]
    for entry in LEVELS:
        if total_xp >= entry[2]:
            current = entry
        else:
            break

    idx = LEVELS.index(current)
    level_num, level_name, level_min = current

    if idx + 1 < len(LEVELS):
        next_min = LEVELS[idx + 1][2]
        xp_in_level = total_xp - level_min
        xp_needed = next_min - level_min
        xp_to_next = max(0, next_min - total_xp)
        progress_pct = min(100, round(xp_in_level / xp_needed * 100))
    else:
        xp_in_level = total_xp - level_min
        xp_to_next = 0
        progress_pct = 100

    return {
        "total_xp": total_xp,
        "level": level_num,
        "level_name": level_name,
        "xp_in_level": xp_in_level,
        "xp_to_next": xp_to_next,
        "progress_pct": progress_pct,
        "is_max_level": idx + 1 >= len(LEVELS),
    }


def award_xp(session: Session, user_id: int, amount: int) -> int:
    """Add XP to user, return new total_xp. Safe if total_xp column is missing (returns 0)."""
    if amount <= 0:
        user = session.exec(select(User).where(User.id == user_id)).first()
        return getattr(user, "total_xp", 0) if user else 0

    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user:
        return 0

    current = getattr(user, "total_xp", None) or 0
    user.total_xp = current + amount  # type: ignore[attr-defined]
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.total_xp  # type: ignore[attr-defined]


def get_user_xp(session: Session, user_id: int) -> dict:
    user = session.exec(select(User).where(User.id == user_id)).first()
    total_xp = getattr(user, "total_xp", 0) if user else 0
    return compute_level(total_xp)
