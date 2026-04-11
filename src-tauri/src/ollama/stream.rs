use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

use super::types::{
    ChatMessage, ChatRequest, ChatResponse, GenerateRequest, GenerateResponse, OllamaOptions,
    PullProgressPayload, ShowResponse,
};

/// `<think>...</think>` ブロックをストリーム中にフィルタリングするヘルパー。
/// トークンを蓄積し、thinking ブロック外のテキストのみを返す。
struct ThinkFilter {
    buffer: String,
    inside_think: bool,
}

impl ThinkFilter {
    fn new() -> Self {
        Self {
            buffer: String::new(),
            inside_think: false,
        }
    }

    fn floor_char_boundary(value: &str, index: usize) -> usize {
        let mut index = index.min(value.len());
        while index > 0 && !value.is_char_boundary(index) {
            index -= 1;
        }
        index
    }

    /// トークンを追加し、表示用テキスト（thinking 外）を返す。
    /// full_content（DB 保存用、thinking 含む生データ）は呼び出し側で別途管理する。
    fn push(&mut self, token: &str) -> String {
        self.buffer.push_str(token);
        let mut display = String::new();

        loop {
            if self.inside_think {
                // </think> の終了タグを探す
                if let Some(end) = self.buffer.find("</think>") {
                    let after = end + "</think>".len();
                    self.buffer = self.buffer[after..].to_string();
                    self.inside_think = false;
                    // 続きがあれば次のループで処理
                } else {
                    // まだ終了タグが見つからない — バッファを保持して待つ
                    // ただし "</think>" の先頭部分がバッファ末尾にある可能性があるので
                    // 安全にクリアできる部分だけ捨てる
                    let keep = "</think>".len() - 1;
                    if self.buffer.len() > keep {
                        let start =
                            Self::floor_char_boundary(&self.buffer, self.buffer.len() - keep);
                        self.buffer = self.buffer[start..].to_string();
                    }
                    break;
                }
            } else {
                // <think> の開始タグを探す
                if let Some(start) = self.buffer.find("<think>") {
                    // <think> より前のテキストを表示に追加
                    display.push_str(&self.buffer[..start]);
                    self.buffer = self.buffer[start + "<think>".len()..].to_string();
                    self.inside_think = true;
                    // 続きを処理（</think> を探す）
                } else {
                    // "<think>" の先頭部分がバッファ末尾にある可能性
                    let keep = "<think>".len() - 1;
                    if self.buffer.len() > keep {
                        let safe =
                            Self::floor_char_boundary(&self.buffer, self.buffer.len() - keep);
                        display.push_str(&self.buffer[..safe]);
                        self.buffer = self.buffer[safe..].to_string();
                    }
                    break;
                }
            }
        }

        display
    }

    /// ストリーム終了時にバッファに残ったテキストを取得
    fn flush(&mut self) -> String {
        if self.inside_think {
            String::new() // thinking 内で終了 → 表示しない
        } else {
            std::mem::take(&mut self.buffer)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ThinkFilter;

    #[test]
    fn push_handles_multibyte_text_across_partial_tag_buffer() {
        let mut filter = ThinkFilter::new();

        let visible = filter.push("名な**");

        assert_eq!(visible, "");
        assert_eq!(filter.flush(), "名な**");
    }

    #[test]
    fn push_filters_thinking_and_preserves_japanese_text() {
        let mut filter = ThinkFilter::new();

        let mut visible = String::new();
        visible.push_str(&filter.push("回答です<th"));
        visible.push_str(&filter.push("ink>思考</think>続きです"));
        visible.push_str(&filter.flush());

        assert_eq!(visible, "回答です続きです");
    }
}

async fn fetch_model_info(client: &Client, base_url: &str, model: &str) -> Option<ShowResponse> {
    let url = format!("{}/api/show", base_url);
    let response = match client
        .post(&url)
        .json(&json!({ "model": model }))
        .send()
        .await
    {
        Ok(response) => response,
        Err(e) => {
            eprintln!("[stream_chat] failed to fetch model info: {}", e);
            return None;
        }
    };

    if !response.status().is_success() {
        eprintln!("[stream_chat] model info status={}", response.status());
        return None;
    }

    match response.json::<ShowResponse>().await {
        Ok(info) => Some(info),
        Err(e) => {
            eprintln!("[stream_chat] failed to parse model info: {}", e);
            None
        }
    }
}

fn should_use_generate_endpoint(info: Option<&ShowResponse>) -> bool {
    let Some(info) = info else {
        return false;
    };

    if info.capabilities.iter().any(|cap| cap == "chat") {
        return false;
    }

    if info.capabilities.iter().any(|cap| cap == "completion") {
        return true;
    }

    let template = info.template.as_deref().unwrap_or_default();
    if template.contains(".Messages") || template.contains(".System") {
        return false;
    }

    template.contains(".Prompt") && !template.contains(".Messages")
}

fn model_uses_chatml(model: &str, info: Option<&ShowResponse>) -> bool {
    let model = model.to_ascii_lowercase();
    if model.contains("qwen") {
        return true;
    }

    info.and_then(|info| info.details.as_ref())
        .map(|details| {
            details
                .family
                .as_deref()
                .unwrap_or_default()
                .to_ascii_lowercase()
                .contains("qwen")
                || details
                    .families
                    .as_deref()
                    .unwrap_or(&[])
                    .iter()
                    .any(|family| family.to_ascii_lowercase().contains("qwen"))
        })
        .unwrap_or(false)
}

fn normalize_chat_role(role: &str) -> &str {
    match role {
        "system" | "user" | "assistant" => role,
        _ => "user",
    }
}

fn build_generate_prompt(messages: &[ChatMessage], chatml: bool) -> String {
    if chatml {
        let mut prompt = String::new();
        for message in messages {
            prompt.push_str("<|im_start|>");
            prompt.push_str(normalize_chat_role(&message.role));
            prompt.push('\n');
            prompt.push_str(&message.content);
            prompt.push_str("<|im_end|>\n");
        }
        prompt.push_str("<|im_start|>assistant\n");
        return prompt;
    }

    let mut prompt = String::new();
    for message in messages {
        let role = match message.role.as_str() {
            "system" => "System",
            "assistant" => "Assistant",
            _ => "User",
        };
        prompt.push_str(role);
        prompt.push_str(":\n");
        prompt.push_str(&message.content);
        prompt.push_str("\n\n");
    }
    prompt.push_str("Assistant:\n");
    prompt
}

fn options_with_stop(mut options: Option<OllamaOptions>, stops: &[&str]) -> Option<OllamaOptions> {
    if stops.is_empty() {
        return options;
    }

    let options = options.get_or_insert_with(OllamaOptions::default);
    let stop = options.stop.get_or_insert_with(Vec::new);
    for value in stops {
        if !stop.iter().any(|existing| existing == value) {
            stop.push((*value).to_string());
        }
    }

    options.clone().into()
}

/// チャットリクエストをストリーミングで送信し、トークンをフロントエンドに emit する。
/// `<think>` ブロックはフィルタリングし、表示用テキストのみを emit する。
/// 完了時にアシスタントノードの全文（thinking 除去済み）を返す。
pub async fn stream_chat(
    client: &Client,
    base_url: &str,
    request: &ChatRequest,
    app: &AppHandle,
    node_id: &str,
    stop_flag: Arc<AtomicBool>,
) -> Result<String> {
    let model_info = fetch_model_info(client, base_url, &request.model).await;
    if should_use_generate_endpoint(model_info.as_ref()) {
        let chatml = model_uses_chatml(&request.model, model_info.as_ref());
        let prompt = build_generate_prompt(&request.messages, chatml);
        let stops = if chatml {
            &["<|im_end|>", "<|endoftext|>"][..]
        } else {
            &["\nUser:", "\nSystem:", "\nユーザー:"][..]
        };
        let generate_request = GenerateRequest {
            model: request.model.clone(),
            prompt,
            stream: request.stream,
            options: options_with_stop(request.options.clone(), stops),
        };
        eprintln!(
            "[stream_chat] model={} uses completion endpoint fallback (chatml={})",
            request.model, chatml
        );
        return stream_generate_endpoint(
            client,
            base_url,
            &generate_request,
            app,
            node_id,
            stop_flag,
        )
        .await;
    }

    stream_chat_endpoint(client, base_url, request, app, node_id, stop_flag).await
}

async fn stream_chat_endpoint(
    client: &Client,
    base_url: &str,
    request: &ChatRequest,
    app: &AppHandle,
    node_id: &str,
    stop_flag: Arc<AtomicBool>,
) -> Result<String> {
    let url = format!("{}/api/chat", base_url);
    eprintln!("[stream_chat] POST {} model={}", url, request.model);

    let response = match client.post(&url).json(request).send().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[stream_chat] connection error: {}", e);
            let _ = app.emit(
                "stream_error",
                json!({ "nodeId": node_id, "error": e.to_string() }),
            );
            return Err(e.into());
        }
    };

    eprintln!(
        "[stream_chat] response status={} for node_id={}",
        response.status(),
        node_id
    );

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let err_msg = format!("Ollama error {}: {}", status, body);
        eprintln!("[stream_chat] error body: {}", err_msg);
        let _ = app.emit(
            "stream_error",
            json!({ "nodeId": node_id, "error": err_msg }),
        );
        return Err(anyhow::anyhow!(err_msg));
    }

    let mut display_content = String::new(); // thinking 除去済み（UI 表示 & DB 保存用）
    let mut stream = response.bytes_stream();
    let mut buf = String::new();
    let mut token_count = 0usize;
    let mut think_filter = ThinkFilter::new();
    let mut first_display_emitted = false;

    while let Some(chunk) = stream.next().await {
        // 中断フラグが立っていればストリームを打ち切る
        if stop_flag.load(Ordering::SeqCst) {
            eprintln!(
                "[stream_chat] stop flag detected, aborting stream for node_id={}",
                node_id
            );
            let _ = app.emit(
                "stream_done",
                json!({ "nodeId": node_id, "totalTokens": token_count }),
            );
            return Ok(display_content);
        }

        let chunk = chunk?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        // 改行区切りで完全な行だけ処理
        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(data) = serde_json::from_str::<ChatResponse>(&line) {
                let token = &data.message.content;
                if !token.is_empty() {
                    token_count += 1;

                    // ThinkFilter を通して <think> ブロックを除去
                    let visible = think_filter.push(token);
                    if !visible.is_empty() {
                        display_content.push_str(&visible);
                        if !first_display_emitted {
                            first_display_emitted = true;
                            eprintln!("[stream_chat] first visible token for node_id={}", node_id);
                        }
                        let _ = app.emit(
                            "stream_token",
                            json!({ "nodeId": node_id, "token": visible }),
                        );
                    }
                }
                if data.done {
                    // フィルタバッファに残ったテキストを flush
                    let remaining = think_filter.flush();
                    if !remaining.is_empty() {
                        display_content.push_str(&remaining);
                        let _ = app.emit(
                            "stream_token",
                            json!({ "nodeId": node_id, "token": remaining }),
                        );
                    }
                    eprintln!(
                        "[stream_chat] done for node_id={}, raw_tokens={}, display_len={}",
                        node_id,
                        data.eval_count,
                        display_content.len()
                    );
                    let _ = app.emit(
                        "stream_done",
                        json!({ "nodeId": node_id, "totalTokens": data.eval_count }),
                    );
                    return Ok(display_content);
                }
            }
        }
    }

    // flush remaining
    let remaining = think_filter.flush();
    if !remaining.is_empty() {
        display_content.push_str(&remaining);
        let _ = app.emit(
            "stream_token",
            json!({ "nodeId": node_id, "token": remaining }),
        );
    }

    eprintln!(
        "[stream_chat] stream ended without done for node_id={}, token_chunks={}, display_len={}",
        node_id,
        token_count,
        display_content.len()
    );
    let _ = app.emit(
        "stream_done",
        json!({ "nodeId": node_id, "totalTokens": token_count }),
    );

    Ok(display_content)
}

async fn stream_generate_endpoint(
    client: &Client,
    base_url: &str,
    request: &GenerateRequest,
    app: &AppHandle,
    node_id: &str,
    stop_flag: Arc<AtomicBool>,
) -> Result<String> {
    let url = format!("{}/api/generate", base_url);
    eprintln!("[stream_chat] POST {} model={}", url, request.model);

    let response = match client.post(&url).json(request).send().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[stream_chat] generate connection error: {}", e);
            let _ = app.emit(
                "stream_error",
                json!({ "nodeId": node_id, "error": e.to_string() }),
            );
            return Err(e.into());
        }
    };

    eprintln!(
        "[stream_chat] generate response status={} for node_id={}",
        response.status(),
        node_id
    );

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let err_msg = format!("Ollama generate error {}: {}", status, body);
        eprintln!("[stream_chat] generate error body: {}", err_msg);
        let _ = app.emit(
            "stream_error",
            json!({ "nodeId": node_id, "error": err_msg }),
        );
        return Err(anyhow::anyhow!(err_msg));
    }

    let mut display_content = String::new();
    let mut stream = response.bytes_stream();
    let mut buf = String::new();
    let mut token_count = 0usize;
    let mut think_filter = ThinkFilter::new();
    let mut first_display_emitted = false;

    while let Some(chunk) = stream.next().await {
        if stop_flag.load(Ordering::SeqCst) {
            eprintln!(
                "[stream_chat] stop flag detected, aborting generate stream for node_id={}",
                node_id
            );
            let _ = app.emit(
                "stream_done",
                json!({ "nodeId": node_id, "totalTokens": token_count }),
            );
            return Ok(display_content);
        }

        let chunk = chunk?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(data) = serde_json::from_str::<GenerateResponse>(&line) {
                if !data.response.is_empty() {
                    token_count += 1;
                    let visible = think_filter.push(&data.response);
                    if !visible.is_empty() {
                        display_content.push_str(&visible);
                        if !first_display_emitted {
                            first_display_emitted = true;
                            eprintln!(
                                "[stream_chat] first visible generate token for node_id={}",
                                node_id
                            );
                        }
                        let _ = app.emit(
                            "stream_token",
                            json!({ "nodeId": node_id, "token": visible }),
                        );
                    }
                }

                if data.done {
                    let remaining = think_filter.flush();
                    if !remaining.is_empty() {
                        display_content.push_str(&remaining);
                        let _ = app.emit(
                            "stream_token",
                            json!({ "nodeId": node_id, "token": remaining }),
                        );
                    }
                    eprintln!(
                        "[stream_chat] generate done for node_id={}, raw_tokens={}, display_len={}",
                        node_id,
                        data.eval_count,
                        display_content.len()
                    );
                    let total_tokens = if data.eval_count > 0 {
                        data.eval_count
                    } else {
                        token_count as i64
                    };
                    let _ = app.emit(
                        "stream_done",
                        json!({ "nodeId": node_id, "totalTokens": total_tokens }),
                    );
                    return Ok(display_content);
                }
            }
        }
    }

    let remaining = think_filter.flush();
    if !remaining.is_empty() {
        display_content.push_str(&remaining);
        let _ = app.emit(
            "stream_token",
            json!({ "nodeId": node_id, "token": remaining }),
        );
    }

    eprintln!(
        "[stream_chat] generate stream ended without done for node_id={}, token_chunks={}, display_len={}",
        node_id,
        token_count,
        display_content.len()
    );
    let _ = app.emit(
        "stream_done",
        json!({ "nodeId": node_id, "totalTokens": token_count }),
    );

    Ok(display_content)
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

    let mut stream = response.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        buf.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buf.find('\n') {
            let line = buf[..pos].trim().to_string();
            buf = buf[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(progress) = serde_json::from_str::<serde_json::Value>(&line) {
                let payload = PullProgressPayload {
                    model: model_name.to_string(),
                    status: progress["status"].as_str().unwrap_or("").to_string(),
                    completed: progress["completed"].as_i64(),
                    total: progress["total"].as_i64(),
                };
                let _ = app.emit("pull_progress", payload);
            }
        }
    }

    Ok(())
}
