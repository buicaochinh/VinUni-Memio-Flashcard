"""Integration tests for authentication endpoints."""


REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/session/login/username"
REFRESH_URL = "/api/auth/session/refresh"


def _register(client, username="user1", password="password123", **kwargs):
    return client.post(REGISTER_URL, json={"username": username, "password": password, **kwargs})


class TestRegister:
    def test_register_success(self, client):
        resp = _register(client, "alice", "pass123", email="alice@example.com", name="Alice")
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "success"
        assert data["user"]["username"] == "alice"

    def test_password_hash_not_leaked(self, client):
        resp = _register(client, "bob", "pass123")
        assert "password_hash" not in resp.json()["user"]

    def test_register_duplicate_username_returns_400(self, client):
        _register(client, "charlie", "password123")
        resp = _register(client, "charlie", "password456")
        assert resp.status_code == 400

    def test_register_username_too_short(self, client):
        resp = _register(client, "ab", "pass123")
        assert resp.status_code == 422

    def test_register_password_too_short(self, client):
        resp = _register(client, "validuser", "abc")
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        resp = _register(client, "daveuser", "pass123", email="not-an-email")
        assert resp.status_code == 422


class TestLogin:
    def test_login_returns_token_pair(self, client):
        _register(client, "loginuser", "testpass")
        resp = client.post(LOGIN_URL, json={"username": "loginuser", "password": "testpass"})
        assert resp.status_code == 200
        tokens = resp.json()["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        _register(client, "wrongpw", "correct")
        resp = client.post(LOGIN_URL, json={"username": "wrongpw", "password": "wrong"})
        assert resp.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        resp = client.post(LOGIN_URL, json={"username": "nobody", "password": "pass"})
        assert resp.status_code == 401

    def test_login_response_includes_user_info(self, client):
        _register(client, "withinfo", "pass123", name="With Info")
        resp = client.post(LOGIN_URL, json={"username": "withinfo", "password": "pass123"})
        assert resp.status_code == 200
        user = resp.json()["user"]
        assert user["username"] == "withinfo"
        assert user["name"] == "With Info"


class TestTokenRefresh:
    def _get_tokens(self, client):
        _register(client, "refresher", "pass123")
        resp = client.post(LOGIN_URL, json={"username": "refresher", "password": "pass123"})
        return resp.json()["tokens"]

    def test_refresh_returns_new_access_token(self, client):
        tokens = self._get_tokens(client)
        resp = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 200
        assert "access_token" in resp.json()["tokens"]

    def test_refresh_with_invalid_token_returns_401(self, client):
        resp = client.post(REFRESH_URL, json={"refresh_token": "not.a.real.token"})
        assert resp.status_code == 401

    def test_refresh_with_access_token_returns_401(self, client):
        _register(client, "wrongtype", "pass123")
        resp = client.post(LOGIN_URL, json={"username": "wrongtype", "password": "pass123"})
        access_token = resp.json()["tokens"]["access_token"]
        # Using access token where refresh token is expected
        resp2 = client.post(REFRESH_URL, json={"refresh_token": access_token})
        assert resp2.status_code == 401


class TestProtectedEndpoint:
    def test_request_without_token_returns_401(self, client):
        resp = client.get("/api/decks/")
        assert resp.status_code == 401

    def test_request_with_valid_token_succeeds(self, client, auth_headers):
        resp = client.get("/api/decks/", headers=auth_headers)
        assert resp.status_code == 200

    def test_request_with_garbage_token_returns_401(self, client):
        resp = client.get("/api/decks/", headers={"Authorization": "Bearer garbage.token.here"})
        assert resp.status_code == 401
