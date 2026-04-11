use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::commands::sessions::DbState;
use crate::db::nodes::{self, Node};
use crate::ollama::client::OllamaClient;
use crate::ollama::stream::stream_chat;
use crate::ollama::types::{ChatMessage, ChatRequest, OllamaOptions};

/// 生成中断フラグ（AppState として管理）
pub struct StopFlag(pub Arc<AtomicBool>);

impl StopFlag {
    pub fn new() -> Self {
        Self(Arc::new(AtomicBool::new(false)))
    }
    pub fn stop(&self) {
        self.0.store(true, Ordering::SeqCst);
    }
    pub fn reset(&self) {
        self.0.store(false, Ordering::SeqCst);
    }
    pub fn is_stopped(&self) -> bool {
        self.0.load(Ordering::SeqCst)
    }
}

/// `<think>...</think>` ブロックを除去し、実際の回答部分のみを返す。
/// ブロックが存在しない場合はそのまま返す。
fn strip_thinking(content: &str) -> String {
    let mut result = content.to_string();
    loop {
        if let (Some(start), Some(end_pos)) = (
            result.find("<think>"),
            result.find("</think>"),
        ) {
            let end = end_pos + "</think>".len();
            if start <= end_pos {
                result = format!("{}{}", &result[..start], &result[end..]);
            } else {
                break;
            }
        } else {
            break;
        }
    }
    result.trim().to_string()
}

#[tauri::command]
pub async fn stop_generation(stop_flag: State<'_, StopFlag>) -> Result<(), String> {
    stop_flag.stop();
    eprintln!("[stop_generation] stop flag set");
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceParams {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub top_k: Option<i32>,
    pub num_ctx: Option<i32>,
    pub repeat_penalty: Option<f32>,
    pub max_tokens: Option<i32>,
}

#[tauri::command]
pub async fn get_nodes(
    db: State<'_, DbState>,
    session_id: String,
) -> Result<Vec<Node>, String> {
    let conn = db.0.lock().unwrap();
    nodes::get_nodes_by_session(&conn, &session_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_node(
    db: State<'_, DbState>,
    node_id: String,
) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    nodes::delete_node(&conn, &node_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_user_node(
    db: State<'_, DbState>,
    session_id: String,
    parent_id: Option<String>,
    content: String,
) -> Result<Node, String> {
    let conn = db.0.lock().unwrap();
    nodes::create_node(
        &conn,
        &session_id,
        parent_id.as_deref(),
        "user",
        &content,
        None,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_message(
    db: State<'_, DbState>,
    ollama: State<'_, OllamaClient>,
    stop_flag: State<'_, StopFlag>,
    app: AppHandle,
    session_id: String,
    user_node_id: String,
    model_id: String,
    params: Option<InferenceParams>,
) -> Result<String, String> {
    // 前回の中断フラグをリセット
    stop_flag.reset();
    // 1. コンテキスト構築（user_node_id の祖先を辿る）
    let ancestors = {
        let conn = db.0.lock().unwrap();
        nodes::get_ancestors(&conn, &user_node_id).map_err(|e| e.to_string())?
    };

    // 2. セッションのシステムプロンプトを取得（未設定の場合はデフォルトを使用）
    let system_prompt = {
        let conn = db.0.lock().unwrap();
        let node = ancestors.first().cloned();
        if let Some(root) = node {
            let session = crate::db::sessions::get_session(&conn, &root.session_id)
                .map_err(|e| e.to_string())?;
            session.system_prompt.or_else(|| {
                Some(
                    "/no_think\n\
                 You are a helpful, friendly AI assistant. \
                 Respond to the user's message directly and naturally. \
                 If the user writes in Japanese, respond in Japanese. \
                 If the user writes in English, respond in English. \
                 Keep your responses concise and relevant to what the user asked."
                        .to_string(),
                )
            })
        } else {
            Some("You are a helpful AI assistant.".to_string())
        }
    };

    // 3. messages 配列を組み立てる
    let mut messages: Vec<ChatMessage> = Vec::new();
    if let Some(sp) = system_prompt {
        messages.push(ChatMessage {
            role: "system".to_string(),
            content: sp,
            images: None,
        });
    }
    for node in &ancestors {
        if node.role != "system" {
            // アシスタントの <think>...</think> 思考ブロックをコンテキストから除去する。
            // Qwen 等の thinking モデルが出力する内部思考をそのまま渡すと
            // 次のターンで混乱が生じるため、表示用コンテンツのみを抽出する。
            let content = if node.role == "assistant" {
                strip_thinking(&node.content)
            } else {
                node.content.clone()
            };
            if !content.trim().is_empty() {
                messages.push(ChatMessage {
                    role: node.role.clone(),
                    content,
                    images: None,
                });
            }
        }
    }

    // 4. アシスタントノードを事前作成（is_streaming = true）
    let assistant_node_id = Uuid::new_v4().to_string();
    {
        let conn = db.0.lock().unwrap();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        conn.execute(
            "INSERT INTO nodes (id, session_id, parent_id, role, content, model_id, is_streaming, created_at)
             VALUES (?1, ?2, ?3, 'assistant', '', ?4, 1, ?5)",
            rusqlite::params![
                assistant_node_id,
                session_id,
                user_node_id,
                model_id,
                now
            ],
        ).map_err(|e| e.to_string())?;
    }

    // 5. フロントエンドに仮ノード ID を通知（stream_token より先に UI を準備させる）
    eprintln!(
        "[send_message] assistant_node_id={}, model={}",
        assistant_node_id, model_id
    );
    let _ = app.emit(
        "stream_token",
        serde_json::json!({ "nodeId": assistant_node_id, "token": "" }),
    );

    // 6. Ollama にストリーミングリクエストを送信
    eprintln!(
        "[send_message] starting stream_chat with {} messages:",
        messages.len()
    );
    for (i, msg) in messages.iter().enumerate() {
        eprintln!(
            "  [{}] role={}, content_len={}, preview={:?}",
            i,
            msg.role,
            msg.content.len(),
            &msg.content.chars().take(100).collect::<String>()
        );
    }
    let options = params.map(|p| OllamaOptions {
        temperature: p.temperature,
        top_p: p.top_p,
        top_k: p.top_k,
        num_ctx: p.num_ctx,
        repeat_penalty: p.repeat_penalty,
        num_predict: p.max_tokens,
        stop: None,
    });

    let request = ChatRequest {
        model: model_id.clone(),
        messages,
        stream: true,
        options,
    };

    let full_content = match stream_chat(
        ollama.http_client(),
        &ollama.base_url,
        &request,
        &app,
        &assistant_node_id,
        stop_flag.0.clone(),
    )
    .await
    {
        Ok(content) => content,
        Err(e) => {
            eprintln!("[send_message] stream_chat failed: {}", e);
            let conn = db.0.lock().unwrap();
            if let Err(db_err) = conn.execute(
                "UPDATE nodes SET is_streaming = 0 WHERE id = ?1",
                rusqlite::params![assistant_node_id],
            ) {
                eprintln!("[send_message] failed to clear streaming flag: {}", db_err);
            }
            return Err(e.to_string());
        }
    };

    // 7. DB にアシスタントの全文を保存（thinking ブロックは除去済み）
    let clean_content = strip_thinking(&full_content);
    eprintln!(
        "[send_message] stream_chat done, raw_len={}, clean_len={}",
        full_content.len(),
        clean_content.len()
    );
    {
        let conn = db.0.lock().unwrap();
        conn.execute(
            "UPDATE nodes SET content = ?1, is_streaming = 0 WHERE id = ?2",
            rusqlite::params![clean_content, assistant_node_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(assistant_node_id)
}
