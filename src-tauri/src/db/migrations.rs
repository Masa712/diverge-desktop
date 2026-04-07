use anyhow::Result;
use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS sessions (
            id          TEXT PRIMARY KEY,
            title       TEXT NOT NULL DEFAULT '新しいセッション',
            model_id    TEXT NOT NULL,
            system_prompt TEXT,
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL,
            metadata    TEXT
        );

        CREATE TABLE IF NOT EXISTS nodes (
            id          TEXT PRIMARY KEY,
            session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            parent_id   TEXT REFERENCES nodes(id),
            role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content     TEXT NOT NULL DEFAULT '',
            model_id    TEXT,
            is_streaming INTEGER NOT NULL DEFAULT 0,
            token_count INTEGER,
            created_at  INTEGER NOT NULL,
            metadata    TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_nodes_session_id ON nodes(session_id);
        CREATE INDEX IF NOT EXISTS idx_nodes_parent_id  ON nodes(parent_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);

        CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
            content,
            session_id UNINDEXED,
            node_id UNINDEXED
        );
        ",
    )?;
    Ok(())
}
