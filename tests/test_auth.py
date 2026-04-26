from backend.auth import extract_bearer_token, hash_password, verify_password


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    password = "StrongPass123"
    stored = hash_password(password)

    assert stored != password
    assert stored.startswith("pbkdf2_sha256$")
    assert verify_password(password, stored) is True
    assert verify_password("WrongPass123", stored) is False


def test_password_hash_rejects_short_password() -> None:
    try:
        hash_password("short")
    except ValueError as exc:
        assert "en az 8" in str(exc)
    else:
        raise AssertionError("Short password should fail")


def test_extract_bearer_token() -> None:
    assert extract_bearer_token(None) is None
    assert extract_bearer_token("Basic abc") is None
    assert extract_bearer_token("Bearer token123") == "token123"
    assert extract_bearer_token("bearer token123") == "token123"
