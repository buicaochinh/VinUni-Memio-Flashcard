"""Unit tests for password hashing and security utilities."""
from src.app.utils.security import (
    hash_password,
    verify_password,
    generate_guest_id,
    BCRYPT_SHA256_PREFIX,
)


class TestHashPassword:
    def test_returns_prefixed_hash(self):
        h = hash_password("mysecret")
        assert h.startswith(BCRYPT_SHA256_PREFIX)

    def test_two_hashes_of_same_password_differ(self):
        # bcrypt uses random salts
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_long_password_handled(self):
        long_pw = "x" * 200
        h = hash_password(long_pw)
        assert h.startswith(BCRYPT_SHA256_PREFIX)


class TestVerifyPassword:
    def test_correct_password_passes(self):
        h = hash_password("correcthorse")
        assert verify_password("correcthorse", h) is True

    def test_wrong_password_fails(self):
        h = hash_password("correcthorse")
        assert verify_password("wrongpassword", h) is False

    def test_empty_password_fails_against_real_hash(self):
        h = hash_password("notempty")
        assert verify_password("", h) is False

    def test_corrupted_hash_returns_false(self):
        assert verify_password("pass", "not-a-valid-hash") is False

    def test_long_password_round_trips(self):
        # SHA-256 pre-hashing means length > 72 bytes is handled correctly
        pw = "a" * 200
        h = hash_password(pw)
        assert verify_password(pw, h) is True

    def test_backward_compat_plain_bcrypt_over_72_bytes_fails(self):
        # The legacy plain-bcrypt path rejects passwords > 72 bytes for safety.
        # Newer bcrypt refuses to hash >72-byte passwords, so we hash at the
        # 72-byte boundary and assert the 73-byte variant is rejected.
        import bcrypt
        plain_72 = "x" * 72
        plain_73 = "x" * 73
        hashed = bcrypt.hashpw(plain_72.encode(), bcrypt.gensalt()).decode()
        assert verify_password(plain_73, hashed) is False

    def test_backward_compat_plain_bcrypt_short_password(self):
        import bcrypt
        plain = "short"
        hashed = bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
        assert verify_password(plain, hashed) is True


class TestGenerateGuestId:
    def test_starts_with_guest_prefix(self):
        gid = generate_guest_id()
        assert gid.startswith("guest_")

    def test_length_is_18(self):
        # "guest_" (6) + 12 chars
        gid = generate_guest_id()
        assert len(gid) == 18

    def test_ids_are_unique(self):
        ids = {generate_guest_id() for _ in range(50)}
        assert len(ids) == 50

    def test_alphanumeric_suffix(self):
        import string
        allowed = set(string.ascii_letters + string.digits)
        for _ in range(20):
            gid = generate_guest_id()
            suffix = gid[len("guest_"):]
            assert set(suffix).issubset(allowed)
