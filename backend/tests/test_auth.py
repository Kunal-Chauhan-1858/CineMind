"""Signup / login coverage, including duplicate-email and duplicate-username
rejection (per the QA checklist in the brief)."""


def test_signup_success(client):
    res = client.post("/api/v1/auth/signup", json={
        "email": "new_user@cinemind.app",
        "username": "new_user",
        "password": "GoodPass1",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["access_token"]
    assert body["user"]["email"] == "new_user@cinemind.app"


def test_signup_rejects_weak_password(client):
    res = client.post("/api/v1/auth/signup", json={
        "email": "weakpw@cinemind.app",
        "username": "weakpw_user",
        "password": "short",
    })
    assert res.status_code == 422


def test_signup_rejects_duplicate_email(client, existing_user):
    res = client.post("/api/v1/auth/signup", json={
        "email": existing_user.email,
        "username": "a_totally_different_username",
        "password": "GoodPass1",
    })
    assert res.status_code == 400
    assert "email" in res.json()["detail"].lower()


def test_signup_rejects_duplicate_username(client, existing_user):
    res = client.post("/api/v1/auth/signup", json={
        "email": "a_totally_different_email@cinemind.app",
        "username": existing_user.username,
        "password": "GoodPass1",
    })
    assert res.status_code == 400
    assert "username" in res.json()["detail"].lower()


def test_login_success(client, existing_user):
    res = client.post("/api/v1/auth/login", json={
        "email": existing_user.email,
        "password": "CorrectHorse1",
    })
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_login_rejects_wrong_password(client, existing_user):
    res = client.post("/api/v1/auth/login", json={
        "email": existing_user.email,
        "password": "WrongPassword1",
    })
    assert res.status_code == 400


def test_login_rate_limited_after_many_attempts(client, existing_user):
    # MAX_ATTEMPTS_PER_WINDOW in app/auth/rate_limit.py is 10 -- hammer past
    # it with bad credentials and confirm the limiter kicks in rather than
    # allowing unlimited brute-force attempts.
    last_status = None
    for _ in range(15):
        res = client.post("/api/v1/auth/login", json={
            "email": existing_user.email,
            "password": "WrongPassword1",
        })
        last_status = res.status_code
    assert last_status == 429
