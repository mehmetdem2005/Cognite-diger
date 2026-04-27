from __future__ import annotations

from typing import Any

from ..db.session import db_session, execute, execute_returning_id, fetch_one


def _dict_or_none(row) -> dict[str, Any] | None:
    return dict(row) if row else None


def create_user(user_id: str, email: str, password_hash: str, full_name: str | None = None) -> dict[str, Any]:
    normalized_email = email.lower().strip()
    with db_session() as conn:
        conn.execute(
            "INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, normalized_email, full_name, password_hash),
        )
        row = conn.execute("SELECT id, email, full_name, is_active, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    row = fetch_one("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    return _dict_or_none(row)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    row = fetch_one("SELECT id, email, full_name, is_active, created_at FROM users WHERE id = ?", (user_id,))
    return _dict_or_none(row)


def create_session(user_id: str, token_hash: str, expires_at: str) -> int:
    return execute_returning_id(
        "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user_id, token_hash, expires_at),
    )


def get_session_by_token_hash(token_hash: str) -> dict[str, Any] | None:
    row = fetch_one(
        """
        SELECT s.*, u.email, u.full_name, u.is_active
        FROM auth_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
        """,
        (token_hash,),
    )
    return _dict_or_none(row)


def revoke_session(token_hash: str) -> bool:
    affected = execute(
        "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL",
        (token_hash,),
    )
    return affected > 0
