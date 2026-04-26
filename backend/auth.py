from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Header, HTTPException

from .repositories.auth import (
    create_session,
    create_user,
    get_session_by_token_hash,
    get_user_by_email,
    revoke_session,
)

PASSWORD_ITERATIONS = 240_000
SESSION_DAYS = 30
LOCAL_USER_ID = "local"


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def hash_password(password: str, salt: bytes | None = None) -> str:
    if len(password) < 8:
        raise ValueError("Şifre en az 8 karakter olmalı.")
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_raw)
        salt = base64.urlsafe_b64decode(salt_raw + "=")
        expected = base64.urlsafe_b64decode(digest_raw + "=")
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_auth_token(user_id: str) -> str:
    token = secrets.token_urlsafe(40)
    expires_at = (datetime.now(UTC) + timedelta(days=SESSION_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    create_session(user_id, hash_token(token), expires_at)
    return token


def register_user(email: str, password: str, full_name: str | None = None) -> tuple[dict[str, Any], str]:
    if get_user_by_email(email):
        raise ValueError("Bu e-posta zaten kayıtlı.")
    user_id = str(uuid.uuid4())
    user = create_user(user_id=user_id, email=email, full_name=full_name, password_hash=hash_password(password))
    token = create_auth_token(user_id)
    return user, token


def login_user(email: str, password: str) -> tuple[dict[str, Any], str]:
    user = get_user_by_email(email)
    if not user or not user.get("is_active"):
        raise ValueError("E-posta veya şifre hatalı.")
    if not verify_password(password, user["password_hash"]):
        raise ValueError("E-posta veya şifre hatalı.")
    token = create_auth_token(user["id"])
    public_user = {"id": user["id"], "email": user["email"], "full_name": user.get("full_name"), "is_active": user.get("is_active")}
    return public_user, token


def logout_token(token: str) -> bool:
    return revoke_session(hash_token(token))


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization:
        return {"id": LOCAL_USER_ID, "email": "local@app", "full_name": "Local Kullanıcı", "is_active": 1}
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Geçersiz oturum başlığı.")
    session = get_session_by_token_hash(hash_token(token))
    if not session or not session.get("is_active"):
        raise HTTPException(status_code=401, detail="Oturum geçersiz veya süresi dolmuş.")
    return {"id": session["user_id"], "email": session["email"], "full_name": session.get("full_name"), "is_active": session.get("is_active")}
