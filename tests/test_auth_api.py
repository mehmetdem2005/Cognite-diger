from uuid import uuid4

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def _email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex}@example.com"


def _register(email: str, password: str = "StrongPass123") -> dict:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_login_me_and_logout_flow() -> None:
    email = _email("auth-flow")
    password = "StrongPass123"
    registered = _register(email, password)

    assert registered["user"]["email"] == email
    assert registered["token"]

    me = client.get("/api/auth/me", headers=_auth_headers(registered["token"]))
    assert me.status_code == 200
    assert me.json()["email"] == email

    login = client.post("/api/auth/login", json={"email": email.upper(), "password": password})
    assert login.status_code == 200
    assert login.json()["user"]["email"] == email

    logout = client.post("/api/auth/logout", headers=_auth_headers(login.json()["token"]))
    assert logout.status_code == 200

    revoked_me = client.get("/api/auth/me", headers=_auth_headers(login.json()["token"]))
    assert revoked_me.status_code == 401


def test_duplicate_register_is_rejected() -> None:
    email = _email("duplicate")
    _register(email)
    duplicate = client.post("/api/auth/register", json={"email": email, "password": "StrongPass123"})
    assert duplicate.status_code == 400


def test_wrong_password_is_rejected() -> None:
    email = _email("wrong-password")
    _register(email)
    login = client.post("/api/auth/login", json={"email": email, "password": "WrongPass123"})
    assert login.status_code == 401


def test_user_listing_isolation() -> None:
    user_a = _register(_email("isolation-a"))
    user_b = _register(_email("isolation-b"))

    create_a = client.post(
        "/api/listings",
        headers=_auth_headers(user_a["token"]),
        json={
            "source": "manual",
            "category": "konut",
            "title": "User A özel ilan",
            "price": 1000000,
            "currency": "TRY",
            "city": "Adana",
            "district": "Seyhan",
            "properties": {"m2": 100},
            "contact": {},
        },
    )
    assert create_a.status_code == 200, create_a.text
    listing_id = create_a.json()["id"]

    list_a = client.get("/api/listings", headers=_auth_headers(user_a["token"]))
    list_b = client.get("/api/listings", headers=_auth_headers(user_b["token"]))

    assert any(item["id"] == listing_id for item in list_a.json())
    assert all(item["id"] != listing_id for item in list_b.json())

    read_b = client.get(f"/api/listings/{listing_id}", headers=_auth_headers(user_b["token"]))
    assert read_b.status_code == 404
