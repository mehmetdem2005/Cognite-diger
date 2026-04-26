from __future__ import annotations

import sqlite3


def ensure_column(conn: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT,
            password_hash TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            revoked_at TEXT
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'local',
            source TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            price REAL NOT NULL,
            currency TEXT NOT NULL,
            city TEXT,
            district TEXT,
            neighborhood TEXT,
            listing_url TEXT,
            image_url TEXT,
            properties_json TEXT NOT NULL,
            contact_json TEXT NOT NULL,
            notes TEXT,
            score REAL NOT NULL,
            risk_level TEXT NOT NULL,
            score_reasons_json TEXT NOT NULL DEFAULT '[]',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column(conn, "listings", "user_id", "user_id TEXT NOT NULL DEFAULT 'local'")
    ensure_column(conn, "listings", "score_reasons_json", "score_reasons_json TEXT NOT NULL DEFAULT '[]'")
    ensure_column(conn, "listings", "is_favorite", "is_favorite INTEGER NOT NULL DEFAULT 0")
    ensure_column(conn, "listings", "updated_at", "updated_at TEXT DEFAULT CURRENT_TIMESTAMP")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS saved_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'local',
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            filters_json TEXT NOT NULL,
            sort_mode TEXT NOT NULL DEFAULT 'newest',
            notification_enabled INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column(conn, "saved_searches", "user_id", "user_id TEXT NOT NULL DEFAULT 'local'")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS data_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'local',
            name TEXT NOT NULL,
            source_type TEXT NOT NULL,
            url TEXT NOT NULL,
            category TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            config_json TEXT NOT NULL DEFAULT '{}',
            last_status TEXT DEFAULT 'never_run',
            last_error TEXT,
            last_synced_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column(conn, "data_sources", "user_id", "user_id TEXT NOT NULL DEFAULT 'local'")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS source_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            external_id TEXT NOT NULL,
            listing_id INTEGER,
            first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source_id, external_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'local',
            job_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            title TEXT NOT NULL,
            payload_json TEXT NOT NULL DEFAULT '{}',
            result_json TEXT,
            error TEXT,
            progress_current INTEGER NOT NULL DEFAULT 0,
            progress_total INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            started_at TEXT,
            finished_at TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column(conn, "jobs", "user_id", "user_id TEXT NOT NULL DEFAULT 'local'")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS job_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            level TEXT NOT NULL DEFAULT 'info',
            message TEXT NOT NULL,
            data_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'local',
            kind TEXT NOT NULL,
            title TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    ensure_column(conn, "scan_history", "user_id", "user_id TEXT NOT NULL DEFAULT 'local'")

    conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_listings_user_category ON listings(user_id, category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_listings_city_district ON listings(city, district)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_saved_searches_user_category ON saved_searches(user_id, category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_saved_searches_category ON saved_searches(category)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_data_sources_user_enabled ON data_sources(user_id, enabled)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(enabled)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_source_items_source_external ON source_items(source_id, external_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(job_type, status)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON job_events(job_id)")
