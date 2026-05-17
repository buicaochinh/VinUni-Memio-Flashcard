"""Unit tests for the SM-2 spaced repetition algorithm.

The UI quality values (0–3) map to SM-2 q-values as:
  0 → 0 (blackout), 1 → 2 (incorrect but recalled), 2 → 4 (correct with hesitation), 3 → 5 (perfect)
"""
from src.app.core.sm2 import get_updated_sm2_values


def fresh_card(**overrides) -> dict:
    return {"ease_factor": 2.5, "repetition": 0, "interval": 0, **overrides}


class TestFirstReview:
    def test_perfect_recall_first_review(self):
        interval, n, ef = get_updated_sm2_values(fresh_card(), quality=3)
        assert interval == 1
        assert n == 1
        assert round(ef, 2) == 2.6  # ef + 0.1

    def test_good_recall_first_review(self):
        # quality=2 maps to q=4; ef change = 0.1 - 1*(0.08+0.02) = 0.0
        interval, n, ef = get_updated_sm2_values(fresh_card(), quality=2)
        assert interval == 1
        assert n == 1
        assert round(ef, 2) == 2.5  # ef unchanged

    def test_failed_recall_resets(self):
        interval, n, ef = get_updated_sm2_values(fresh_card(), quality=0)
        assert interval == 1
        assert n == 0  # repetition reset

    def test_hard_recall_resets(self):
        # quality=1 maps to q=2 which is < 3 → reset
        interval, n, ef = get_updated_sm2_values(fresh_card(), quality=1)
        assert interval == 1
        assert n == 0


class TestSubsequentReviews:
    def test_second_perfect_review(self):
        card = fresh_card(ease_factor=2.6, repetition=1, interval=1)
        interval, n, ef = get_updated_sm2_values(card, quality=3)
        assert interval == 6
        assert n == 2

    def test_third_review_uses_ef_multiplier(self):
        card = fresh_card(ease_factor=2.5, repetition=2, interval=6)
        interval, n, ef = get_updated_sm2_values(card, quality=3)
        assert interval == round(6 * 2.5)  # 15
        assert n == 3

    def test_failed_review_resets_repetition(self):
        card = fresh_card(ease_factor=2.5, repetition=5, interval=30)
        interval, n, ef = get_updated_sm2_values(card, quality=0)
        assert n == 0
        assert interval == 1


class TestEaseFactorBounds:
    def test_ef_increases_on_perfect(self):
        card = fresh_card(ease_factor=2.5)
        _, _, ef = get_updated_sm2_values(card, quality=3)
        assert ef > 2.5

    def test_ef_decreases_on_failure(self):
        card = fresh_card(ease_factor=2.5)
        _, _, ef = get_updated_sm2_values(card, quality=0)
        assert ef < 2.5

    def test_ef_floor_is_1_3(self):
        # ef=1.3 with quality=0 would go below floor → clamped to 1.3
        card = fresh_card(ease_factor=1.3)
        _, _, ef = get_updated_sm2_values(card, quality=0)
        assert ef == 1.3

    def test_ef_stays_at_floor_when_already_at_min(self):
        card = fresh_card(ease_factor=1.4)
        _, _, ef = get_updated_sm2_values(card, quality=0)
        # 1.4 - 0.8 = 0.6, clamped to 1.3
        assert ef == 1.3


class TestDefaults:
    def test_missing_ease_factor_defaults_to_2_5(self):
        card = {}
        interval, n, ef = get_updated_sm2_values(card, quality=3)
        assert ef > 2.5  # started from 2.5 and improved

    def test_none_values_default_to_zero(self):
        card = {"ease_factor": None, "repetition": None, "interval": None}
        interval, n, ef = get_updated_sm2_values(card, quality=3)
        assert interval == 1
        assert n == 1

    def test_unknown_quality_maps_to_zero(self):
        card = fresh_card()
        interval, n, ef = get_updated_sm2_values(card, quality=99)
        # q_map.get(99, 0) → q=0 → failure path
        assert n == 0
