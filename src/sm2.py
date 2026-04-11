def get_updated_sm2_values(card: dict, quality: int):
    q_map = {0: 0, 1: 2, 2: 4, 3: 5}
    q = q_map.get(quality, 0)

    ef = card.get("ease_factor", 2.5) or 2.5
    n = card.get("repetition", 0) or 0
    interval = card.get("interval", 0) or 0

    if q >= 3:
        if n == 0:
            interval = 1
        elif n == 1:
            interval = 6
        else:
            interval = round(interval * ef)
        n += 1
    else:
        n = 0
        interval = 1

    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if ef < 1.3:
        ef = 1.3

    return interval, n, ef
