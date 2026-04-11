use serde::{Deserialize, Serialize};

// ── チャット ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Clone, Default)]
pub struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_ctx: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repeat_penalty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub message: ChatMessage,
    pub done: bool,
    #[serde(default)]
    pub eval_count: i64,
    #[allow(dead_code)]
    #[serde(default)]
    pub prompt_eval_count: i64,
}

#[derive(Debug, Serialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Debug, Deserialize)]
pub struct GenerateResponse {
    #[serde(default)]
    pub response: String,
    pub done: bool,
    #[serde(default)]
    pub eval_count: i64,
    #[allow(dead_code)]
    #[serde(default)]
    pub prompt_eval_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct ShowResponse {
    #[serde(default)]
    pub template: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub details: Option<ShowDetails>,
}

#[derive(Debug, Deserialize)]
pub struct ShowDetails {
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub families: Option<Vec<String>>,
}

// ── モデル一覧 ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all(deserialize = "snake_case", serialize = "camelCase"))]
pub struct OllamaModelDetails {
    pub family: String,
    pub families: Option<Vec<String>>,
    pub parameter_size: String,
    pub quantization_level: String,
    pub format: Option<String>,
    #[serde(default)]
    pub parent_model: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all(deserialize = "snake_case", serialize = "camelCase"))]
pub struct OllamaModel {
    pub name: String,
    pub size: i64,
    pub digest: String,
    pub modified_at: String,
    pub details: OllamaModelDetails,
}

#[derive(Debug, Deserialize)]
pub struct TagsResponse {
    pub models: Vec<OllamaModel>,
}

// ── 実行中モデル ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all(deserialize = "snake_case", serialize = "camelCase"))]
pub struct RunningModel {
    pub name: String,
    pub size: i64,
    pub size_vram: i64,
    pub expires_at: String,
}

#[derive(Debug, Deserialize)]
pub struct PsResponse {
    pub models: Vec<RunningModel>,
}

// ── バージョン ────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct VersionResponse {
    pub version: String,
}

// ── プル進捗 ──────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PullProgressPayload {
    pub model: String,
    pub status: String,
    pub completed: Option<i64>,
    pub total: Option<i64>,
}
