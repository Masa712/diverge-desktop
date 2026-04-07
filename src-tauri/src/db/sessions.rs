use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub title: String,
    pub model_id: String,
    pub system_prompt: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub metadata: Option<String>,
}

pub fn create_session(conn: &Connection, model_id: &str, title: Option<&str>) -> Result<Session> {
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    let title = title.unwrap_or("新しいセッション");

    conn.execute(
        "INSERT INTO sessions (id, title, model_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, title, model_id, now, now],
    )?;

    Ok(Session {
        id,
        title: title.to_string(),
        model_id: model_id.to_string(),
        system_prompt: None,
        created_at: now,
        updated_at: now,
        metadata: None,
    })
}

pub fn list_sessions(conn: &Connection) -> Result<Vec<Session>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, model_id, system_prompt, created_at, updated_at, metadata
         FROM sessions ORDER BY updated_at DESC",
    )?;

    let sessions = stmt.query_map([], |row| {
        Ok(Session {
            id: row.get(0)?,
            title: row.get(1)?,
            model_id: row.get(2)?,
            system_prompt: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            metadata: row.get(6)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;

    Ok(sessions)
}

pub fn get_session(conn: &Connection, id: &str) -> Result<Session> {
    let session = conn.query_row(
        "SELECT id, title, model_id, system_prompt, created_at, updated_at, metadata
         FROM sessions WHERE id = ?1",
        params![id],
        |row| {
            Ok(Session {
                id: row.get(0)?,
                title: row.get(1)?,
                model_id: row.get(2)?,
                system_prompt: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                metadata: row.get(6)?,
            })
        },
    )?;
    Ok(session)
}

pub fn update_session(
    conn: &Connection,
    id: &str,
    title: Option<&str>,
    system_prompt: Option<&str>,
) -> Result<()> {
    let now = now_ms();
    if let Some(t) = title {
        conn.execute(
            "UPDATE sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![t, now, id],
        )?;
    }
    if let Some(sp) = system_prompt {
        conn.execute(
            "UPDATE sessions SET system_prompt = ?1, updated_at = ?2 WHERE id = ?3",
            params![sp, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_session(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
    Ok(())
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
