from __future__ import annotations

from typing import Any

from ..db.connection import get_conn


def create_user(user_id: str, email: str, password_hash: str, full_name: str | None = None) -> dict[str, Any]:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, email, full_name, password_hash) VALUES (?, ?, ?, ?)",
            (user_id, email.lower().strip(), full_name, password_hash),
        )
        row = conn.execute("SELECT id, email, full_name, is_active, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute("SELECT id, email, full_name, is_active, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None


def create_session(user_id: str, token_hash: str, expires_at: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
            (user_id, token_hash, expires_at),
        )
        return int(cur.lastrowid)


def get_session_by_token_hash(token_hash: str) -> dict[str, Any] | None:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT s.*, u.email, u.full_name, u.is_active
            FROM auth_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
            """,
            (token_hash,),
        ).fetchone()
        return dict(row) if row else None


def revoke_session(token_hash: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL",
            (token_hash,),
        )
        return cur.rowcount > 0
