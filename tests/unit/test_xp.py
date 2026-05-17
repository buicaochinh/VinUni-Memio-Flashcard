"""Unit tests for the XP and level-up system."""
from src.app.services.xp_service import compute_level, LEVELS


class TestComputeLevelBoundaries:
    def test_level_1_at_zero_xp(self):
        result = compute_level(0)
        assert result["level"] == 1
        assert result["level_name"] == "Tân Binh"
        assert result["total_xp"] == 0

    def test_level_1_just_before_threshold(self):
        result = compute_level(99)
        assert result["level"] == 1

    def test_level_2_at_threshold(self):
        result = compute_level(100)
        assert result["level"] == 2
        assert result["level_name"] == "Học Viên"

    def test_max_level_at_5000_xp(self):
        result = compute_level(5000)
        assert result["level"] == 10
        assert result["level_name"] == "Vĩ Nhân"
        assert result["is_max_level"] is True

    def test_max_level_beyond_5000_xp(self):
        result = compute_level(99999)
        assert result["level"] == 10
        assert result["is_max_level"] is True

    def test_every_level_threshold(self):
        for level_num, name, min_xp in LEVELS:
            result = compute_level(min_xp)
            assert result["level"] == level_num, f"Expected level {level_num} at {min_xp} XP"


class TestProgressPercentage:
    def test_zero_xp_is_zero_percent(self):
        result = compute_level(0)
        assert result["progress_pct"] == 0

    def test_halfway_through_level_is_50_percent(self):
        # Level 1: 0–100. At 50 XP → 50%
        result = compute_level(50)
        assert result["progress_pct"] == 50

    def test_just_at_level_threshold_is_zero_percent(self):
        # Level 2 starts at 100 XP. At exactly 100 → 0% progress into level 2
        result = compute_level(100)
        assert result["progress_pct"] == 0

    def test_max_level_is_100_percent(self):
        result = compute_level(5000)
        assert result["progress_pct"] == 100

    def test_progress_pct_capped_at_100(self):
        result = compute_level(100000)
        assert result["progress_pct"] == 100


class TestXpToNext:
    def test_xp_to_next_at_level_1_start(self):
        result = compute_level(0)
        assert result["xp_to_next"] == 100  # level 2 at 100

    def test_xp_to_next_decreases_as_xp_earned(self):
        r1 = compute_level(0)
        r2 = compute_level(50)
        assert r2["xp_to_next"] < r1["xp_to_next"]

    def test_xp_to_next_is_zero_at_max_level(self):
        result = compute_level(5000)
        assert result["xp_to_next"] == 0


class TestXpInLevel:
    def test_xp_in_level_at_start(self):
        result = compute_level(0)
        assert result["xp_in_level"] == 0

    def test_xp_in_level_midway(self):
        result = compute_level(150)  # level 2 (100–249), 50 XP into it
        assert result["xp_in_level"] == 50

    def test_total_xp_preserved(self):
        for xp in [0, 50, 100, 500, 1000, 5000]:
            result = compute_level(xp)
            assert result["total_xp"] == xp
