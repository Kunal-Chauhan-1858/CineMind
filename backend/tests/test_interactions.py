"""Watchlist add/remove/status-change and rating creation + idempotent
update coverage (guards against A5's "toggle never actually removes
anything" regression)."""
import pytest


@pytest.fixture()
def auth_headers(client):
    res = client.post("/api/v1/auth/signup", json={
        "email": "watcher@cinemind.app",
        "username": "watcher",
        "password": "GoodPass1",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _first_movie_id(client, auth_headers):
    res = client.get("/api/v1/recommendations/hybrid", params={"top_n": 1}, headers=auth_headers)
    return res.json()[0]["id"]


def test_watchlist_add_then_remove(client, auth_headers):
    movie_id = _first_movie_id(client, auth_headers)

    add_res = client.post("/api/v1/interactions/watchlist", json={
        "movie_id": movie_id, "status": "want_to_watch"
    }, headers=auth_headers)
    assert add_res.status_code == 200

    list_res = client.get("/api/v1/interactions/watchlist", headers=auth_headers)
    assert any(item["movie_id"] == movie_id for item in list_res.json())

    remove_res = client.delete(f"/api/v1/interactions/watchlist/{movie_id}", headers=auth_headers)
    assert remove_res.status_code == 200

    list_after = client.get("/api/v1/interactions/watchlist", headers=auth_headers)
    assert not any(item["movie_id"] == movie_id for item in list_after.json())


def test_watchlist_status_change_to_watching(client, auth_headers):
    movie_id = _first_movie_id(client, auth_headers)

    client.post("/api/v1/interactions/watchlist", json={
        "movie_id": movie_id, "status": "want_to_watch"
    }, headers=auth_headers)

    update_res = client.post("/api/v1/interactions/watchlist", json={
        "movie_id": movie_id, "status": "watching"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "watching"

    list_res = client.get("/api/v1/interactions/watchlist", headers=auth_headers)
    item = next(i for i in list_res.json() if i["movie_id"] == movie_id)
    assert item["status"] == "watching"


def test_rating_creation_and_idempotent_update(client, auth_headers):
    movie_id = _first_movie_id(client, auth_headers)

    first = client.post("/api/v1/interactions/ratings", json={
        "movie_id": movie_id, "score": 3
    }, headers=auth_headers)
    assert first.status_code == 200
    assert first.json()["score"] == 3

    # Rating the same movie again should update the existing row, not
    # create a second one.
    second = client.post("/api/v1/interactions/ratings", json={
        "movie_id": movie_id, "score": 5
    }, headers=auth_headers)
    assert second.status_code == 200
    assert second.json()["score"] == 5
    assert second.json()["id"] == first.json()["id"]
