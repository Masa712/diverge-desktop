use anyhow::Result;
use reqwest::Client;
use serde_json::json;
use tauri::{AppHandle, Emitter};

use super::types::{ChatRequest, ChatResponse, PullProgressPayload};

/// チャットリクエストをストリーミングで送信し、トークンをフロントエンドに emit する。
/// 完了時にアシスタントノードの全文を返す。
pub async fn stream_chat(
    client: &Client,
    base_url: &str,
    request: &ChatRequest,
    app: &AppHandle,
    node_id: &str,
) -> Result<String> {
    let url = format!("{}/api/chat", base_url);
    let response = client.post(&url).json(request).send().await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let err_msg = format!("Ollama error {}: {}", status, body);
        let _ = app.emit("stream_error", json!({ "nodeId": node_id, "error": err_msg }));
        return Err(anyhow::anyhow!(err_msg));
    }

    let mut full_content = String::new();
    let mut total_tokens: i64 = 0;
    let bytes = response.bytes().await?;

    // Ollama は改行区切りの JSON オブジェクトを返す（NDJSON）
    for line in String::from_utf8_lossy(&bytes).lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(data) = serde_json::from_str::<ChatResponse>(line) {
            let token = &data.message.content;
            if !token.is_empty() {
                full_content.push_str(token);
                let _ = app.emit("stream_token", json!({ "nodeId": node_id, "token": token }));
            }
            if data.done {
                total_tokens = data.eval_count;
                let _ = app.emit(
                    "stream_done",
                    json!({ "nodeId": node_id, "totalTokens": total_tokens }),
                );
                break;
            }
        }
    }

    Ok(full_content)
}

/// モデルのプルをストリーミングで実行し、進捗を emit する。
pub async fn stream_pull(
    client: &Client,
    base_url: &str,
    model_name: &str,
    app: &AppHandle,
) -> Result<()> {
    let url = format!("{}/api/pull", base_url);
    let response = client
        .post(&url)
        .json(&json!({ "name": model_name, "stream": true }))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!("Pull failed: {}", response.status()));
    }

    let bytes = response.bytes().await?;
    for line in String::from_utf8_lossy(&bytes).lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(progress) = serde_json::from_str::<serde_json::Value>(line) {
            let payload = PullProgressPayload {
                model: model_name.to_string(),
                status: progress["status"].as_str().unwrap_or("").to_string(),
                completed: progress["completed"].as_i64(),
                total: progress["total"].as_i64(),
            };
            let _ = app.emit("pull_progress", payload);
        }
    }

    Ok(())
}
