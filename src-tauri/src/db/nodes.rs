use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub id: String,
    pub session_id: String,
    pub parent_id: Option<String>,
    pub role: String,
    pub content: String,
    pub model_id: Option<String>,
    pub is_streaming: bool,
    pub token_count: Option<i64>,
    pub created_at: i64,
    pub metadata: Option<String>,
}

pub fn create_node(
    conn: &Connection,
    session_id: &str,
    parent_id: Option<&str>,
    role: &str,
    content: &str,
    model_id: Option<&str>,
) -> Result<Node> {
    let id = Uuid::new_v4().to_string();
    let now = now_ms();

    conn.execute(
        "INSERT INTO nodes (id, session_id, parent_id, role, content, model_id, is_streaming, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        params![id, session_id, parent_id, role, content, model_id, now],
    )?;

    // sessions の updated_at を更新
    conn.execute(
        "UPDATE sessions SET updated_at = ?1 WHERE id = ?2",
        params![now, session_id],
    )?;

    Ok(Node {
        id,
        session_id: session_id.to_string(),
        parent_id: parent_id.map(str::to_string),
        role: role.to_string(),
        content: content.to_string(),
        model_id: model_id.map(str::to_string),
        is_streaming: false,
        token_count: None,
        created_at: now,
        metadata: None,
    })
}

pub fn get_nodes_by_session(conn: &Connection, session_id: &str) -> Result<Vec<Node>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, parent_id, role, content, model_id, is_streaming, token_count, created_at, metadata
         FROM nodes WHERE session_id = ?1 ORDER BY created_at ASC",
    )?;

    let nodes = stmt.query_map(params![session_id], |row| {
        Ok(Node {
            id: row.get(0)?,
            session_id: row.get(1)?,
            parent_id: row.get(2)?,
            role: row.get(3)?,
            content: row.get(4)?,
            model_id: row.get(5)?,
            is_streaming: row.get::<_, i64>(6)? != 0,
            token_count: row.get(7)?,
            created_at: row.get(8)?,
            metadata: row.get(9)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()?;

    Ok(nodes)
}

pub fn set_node_streaming(conn: &Connection, node_id: &str, streaming: bool) -> Result<()> {
    conn.execute(
        "UPDATE nodes SET is_streaming = ?1 WHERE id = ?2",
        params![streaming as i64, node_id],
    )?;
    Ok(())
}

pub fn append_node_content(conn: &Connection, node_id: &str, token: &str) -> Result<()> {
    conn.execute(
        "UPDATE nodes SET content = content || ?1 WHERE id = ?2",
        params![token, node_id],
    )?;
    Ok(())
}

pub fn finalize_node(conn: &Connection, node_id: &str, total_tokens: i64) -> Result<()> {
    conn.execute(
        "UPDATE nodes SET is_streaming = 0, token_count = ?1 WHERE id = ?2",
        params![total_tokens, node_id],
    )?;
    Ok(())
}

pub fn get_ancestors(conn: &Connection, node_id: &str) -> Result<Vec<Node>> {
    // 祖先ノードをルートから順に返す（context 構築用）
    let mut ancestors: Vec<Node> = Vec::new();
    let mut current_id = node_id.to_string();

    loop {
        let node = conn.query_row(
            "SELECT id, session_id, parent_id, role, content, model_id, is_streaming, token_count, created_at, metadata
             FROM nodes WHERE id = ?1",
            params![current_id],
            |row| {
                Ok(Node {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    parent_id: row.get(2)?,
                    role: row.get(3)?,
                    content: row.get(4)?,
                    model_id: row.get(5)?,
                    is_streaming: row.get::<_, i64>(6)? != 0,
                    token_count: row.get(7)?,
                    created_at: row.get(8)?,
                    metadata: row.get(9)?,
                })
            },
        )?;

        let parent_id = node.parent_id.clone();
        ancestors.push(node);

        match parent_id {
            Some(pid) => current_id = pid,
            None => break,
        }
    }

    ancestors.reverse(); // ルート → 末端の順に
    Ok(ancestors)
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
