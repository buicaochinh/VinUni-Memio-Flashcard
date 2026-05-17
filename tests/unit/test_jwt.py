"""Unit tests for JWT token utilities."""
import pytest
import jwt

from src.app.utils.jwt_auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_bearer_token,
    hash_refresh_token,
    new_link_code,
    AuthConfigError,
)


class TestCreateAccessToken:
    def test_returns_decodable_string(self):
        token = create_access_token(user_id=42)
        assert isinstance(token, str)
        data = decode_token(token)
        assert data["sub"] == "42"

    def test_typ_is_access(self):
        token = create_access_token(user_id=1)
        data = decode_token(token)
        assert data["typ"] == "access"

    def test_contains_iat_and_exp(self):
        token = create_access_token(user_id=1)
        data = decode_token(token)
        assert "iat" in data
        assert "exp" in data
        assert data["exp"] > data["iat"]


class TestCreateRefreshToken:
    def test_returns_decodable_string(self):
        token = create_refresh_token(session_id=7, user_id=42)
        data = decode_token(token)
        assert data["sub"] == "42"
        assert data["sid"] == "7"

    def test_typ_is_refresh(self):
        token = create_refresh_token(session_id=1, user_id=1)
        data = decode_token(token)
        assert data["typ"] == "refresh"

    def test_refresh_expiry_longer_than_access(self):
        access = create_access_token(user_id=1)
        refresh = create_refresh_token(session_id=1, user_id=1)
        access_exp = decode_token(access)["exp"]
        refresh_exp = decode_token(refresh)["exp"]
        assert refresh_exp > access_exp


class TestDecodeToken:
    def test_raises_on_tampered_token(self):
        token = create_access_token(user_id=1)
        tampered = token[:-4] + "xxxx"
        with pytest.raises(Exception):
            decode_token(tampered)

    def test_raises_on_expired_token(self, monkeypatch):
        import src.app.utils.jwt_auth as jwt_mod
        from datetime import datetime, timezone, timedelta

        original_now = jwt_mod._now_utc

        def past_now():
            return datetime.now(timezone.utc) - timedelta(hours=2)

        monkeypatch.setattr(jwt_mod, "_now_utc", past_now)
        token = create_access_token(user_id=1)
        monkeypatch.setattr(jwt_mod, "_now_utc", original_now)

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_token(token)

    def test_raises_without_jwt_secret(self, monkeypatch):
        import src.app.utils.jwt_auth as jwt_mod
        monkeypatch.setattr(jwt_mod, "JWT_SECRET", "")
        with pytest.raises(AuthConfigError):
            create_access_token(user_id=1)


class TestGetBearerToken:
    def test_valid_bearer_header(self):
        assert get_bearer_token("Bearer mytoken123") == "mytoken123"

    def test_case_insensitive_bearer(self):
        assert get_bearer_token("bearer mytoken") == "mytoken"

    def test_none_returns_none(self):
        assert get_bearer_token(None) is None

    def test_empty_returns_none(self):
        assert get_bearer_token("") is None

    def test_no_bearer_prefix_returns_none(self):
        assert get_bearer_token("mytoken") is None

    def test_extra_parts_returns_none(self):
        assert get_bearer_token("Bearer tok extra") is None


class TestHashRefreshToken:
    def test_produces_64_char_hex(self):
        h = hash_refresh_token("sometoken")
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_same_input_same_hash(self):
        assert hash_refresh_token("x") == hash_refresh_token("x")

    def test_different_input_different_hash(self):
        assert hash_refresh_token("a") != hash_refresh_token("b")


class TestNewLinkCode:
    def test_default_length_is_8(self):
        code = new_link_code()
        assert len(code) == 8

    def test_custom_length(self):
        code = new_link_code(length=12)
        assert len(code) == 12

    def test_only_safe_chars(self):
        alphabet = set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        for _ in range(20):
            code = new_link_code()
            assert set(code).issubset(alphabet)

    def test_codes_are_unique(self):
        codes = {new_link_code() for _ in range(50)}
        assert len(codes) == 50
