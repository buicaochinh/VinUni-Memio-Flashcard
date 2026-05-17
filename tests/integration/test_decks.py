"""Integration tests for deck CRUD and sharing endpoints."""


DECKS_URL = "/api/decks/"


def _create_deck(client, auth_headers, name="Test Deck", description=""):
    return client.post(DECKS_URL, json={"name": name, "description": description}, headers=auth_headers)


class TestGetDecks:
    def test_unauthenticated_returns_401(self, client):
        resp = client.get(DECKS_URL)
        assert resp.status_code == 401

    def test_authenticated_empty_list(self, client, auth_headers):
        resp = client.get(DECKS_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["decks"] == []

    def test_lists_only_own_decks(self, client, db_session, auth_headers):
        from src.app.services.user_service import register_user
        from src.app.utils.jwt_auth import create_access_token

        _create_deck(client, auth_headers, "My Deck")

        other_user = register_user(db_session, "otheruser", "pass123")
        other_token = create_access_token(user_id=other_user["id"])
        other_headers = {"Authorization": f"Bearer {other_token}"}
        _create_deck(client, other_headers, "Other Deck")

        resp = client.get(DECKS_URL, headers=auth_headers)
        names = [d["name"] for d in resp.json()["decks"]]
        assert "My Deck" in names
        assert "Other Deck" not in names


class TestCreateDeck:
    def test_create_returns_deck_id(self, client, auth_headers):
        resp = _create_deck(client, auth_headers)
        assert resp.status_code == 200
        assert "deck_id" in resp.json()
        assert isinstance(resp.json()["deck_id"], int)

    def test_deck_appears_in_list(self, client, auth_headers):
        _create_deck(client, auth_headers, "Flash Physics")
        decks = client.get(DECKS_URL, headers=auth_headers).json()["decks"]
        assert any(d["name"] == "Flash Physics" for d in decks)

    def test_create_multiple_decks(self, client, auth_headers):
        for i in range(3):
            _create_deck(client, auth_headers, f"Deck {i}")
        decks = client.get(DECKS_URL, headers=auth_headers).json()["decks"]
        assert len(decks) == 3

    def test_create_without_description(self, client, auth_headers):
        resp = client.post(DECKS_URL, json={"name": "No Desc"}, headers=auth_headers)
        assert resp.status_code == 200


class TestUpdateDeck:
    def test_update_name_and_description(self, client, auth_headers):
        deck_id = _create_deck(client, auth_headers, "Old Name").json()["deck_id"]
        resp = client.put(f"/api/decks/{deck_id}", json={"name": "New Name", "description": "Updated"}, headers=auth_headers)
        assert resp.status_code == 200

        decks = client.get(DECKS_URL, headers=auth_headers).json()["decks"]
        deck = next(d for d in decks if d["id"] == deck_id)
        assert deck["name"] == "New Name"
        assert deck["description"] == "Updated"

    def test_update_nonexistent_deck_returns_404(self, client, auth_headers):
        resp = client.put("/api/decks/99999", json={"name": "X", "description": ""}, headers=auth_headers)
        assert resp.status_code == 404

    def test_cannot_update_another_users_deck(self, client, db_session, auth_headers):
        from src.app.services.user_service import register_user
        from src.app.utils.jwt_auth import create_access_token

        deck_id = _create_deck(client, auth_headers, "Protected").json()["deck_id"]

        other = register_user(db_session, "attacker", "pass123")
        attacker_headers = {"Authorization": f"Bearer {create_access_token(user_id=other['id'])}"}

        resp = client.put(f"/api/decks/{deck_id}", json={"name": "Hacked", "description": ""}, headers=attacker_headers)
        assert resp.status_code == 404


class TestDeleteDeck:
    def test_delete_removes_deck(self, client, auth_headers):
        deck_id = _create_deck(client, auth_headers, "To Delete").json()["deck_id"]
        resp = client.delete(f"/api/decks/{deck_id}", headers=auth_headers)
        assert resp.status_code == 200

        decks = client.get(DECKS_URL, headers=auth_headers).json()["decks"]
        assert not any(d["id"] == deck_id for d in decks)

    def test_delete_nonexistent_deck_is_idempotent(self, client, auth_headers):
        resp = client.delete("/api/decks/99999", headers=auth_headers)
        assert resp.status_code == 200


class TestDeckSharing:
    def test_enable_sharing_returns_token(self, client, auth_headers):
        deck_id = _create_deck(client, auth_headers, "Public Deck").json()["deck_id"]
        resp = client.post(f"/api/decks/{deck_id}/share", headers=auth_headers)
        assert resp.status_code == 200
        assert "share_token" in resp.json()
        assert len(resp.json()["share_token"]) > 0

    def test_shared_deck_accessible_without_auth(self, client, auth_headers):
        deck_id = _create_deck(client, auth_headers, "Shared Deck").json()["deck_id"]
        token = client.post(f"/api/decks/{deck_id}/share", headers=auth_headers).json()["share_token"]

        resp = client.get(f"/api/decks/shared/{token}")
        assert resp.status_code == 200
        assert resp.json()["deck"]["name"] == "Shared Deck"
        assert "cards" in resp.json()

    def test_nonexistent_share_token_returns_404(self, client):
        resp = client.get("/api/decks/shared/token-that-does-not-exist")
        assert resp.status_code == 404

    def test_disable_sharing_hides_deck(self, client, auth_headers):
        deck_id = _create_deck(client, auth_headers, "To Unshare").json()["deck_id"]
        token = client.post(f"/api/decks/{deck_id}/share", headers=auth_headers).json()["share_token"]

        client.delete(f"/api/decks/{deck_id}/share", headers=auth_headers)

        resp = client.get(f"/api/decks/shared/{token}")
        assert resp.status_code == 404
