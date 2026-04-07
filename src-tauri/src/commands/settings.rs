use serde::{Deserialize, Serialize};
use tauri::State;

use crate::keychain;
use crate::ollama::client::OllamaClient;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OllamaSettings {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InferenceDefaults {
    pub default_model: String,
    pub temperature: Option<f32>,
    pub num_ctx: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub font_family: String,
    pub ollama: OllamaSettings,
    pub inference: InferenceDefaults,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            theme: "dark".to_string(),
            font_size: 14,
            font_family: "system-ui".to_string(),
            ollama: OllamaSettings {
                host: "http://localhost".to_string(),
                port: 11434,
            },
            inference: InferenceDefaults {
                default_model: String::new(),
                temperature: Some(0.7),
                num_ctx: Some(4096),
            },
        }
    }
}

#[tauri::command]
pub async fn check_ollama_status(
    ollama: State<'_, OllamaClient>,
) -> Result<serde_json::Value, String> {
    match ollama.check_status().await.map_err(|e| e.to_string())? {
        Some(version) => Ok(serde_json::json!({ "running": true, "version": version })),
        None => Ok(serde_json::json!({ "running": false })),
    }
}

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
pub async fn update_settings(_settings: serde_json::Value) -> Result<(), String> {
    // TODO: tauri-plugin-store への保存（Phase 2 で実装）
    Ok(())
}

#[tauri::command]
pub async fn get_api_key(service: String) -> Result<Option<String>, String> {
    keychain::get_api_key(&service).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_api_key(service: String, key: String) -> Result<(), String> {
    keychain::store_api_key(&service, &key).map_err(|e| e.to_string())
}
