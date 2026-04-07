use tauri::{AppHandle, State};

use crate::ollama::client::OllamaClient;
use crate::ollama::stream::stream_pull;
use crate::ollama::types::{OllamaModel, RunningModel};

#[tauri::command]
pub async fn list_local_models(
    ollama: State<'_, OllamaClient>,
) -> Result<Vec<OllamaModel>, String> {
    ollama.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_running_models(
    ollama: State<'_, OllamaClient>,
) -> Result<Vec<RunningModel>, String> {
    ollama.list_running().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pull_model(
    ollama: State<'_, OllamaClient>,
    app: AppHandle,
    name: String,
) -> Result<(), String> {
    stream_pull(ollama.http_client(), &ollama.base_url, &name, &app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_model(
    ollama: State<'_, OllamaClient>,
    name: String,
) -> Result<(), String> {
    ollama.delete_model(&name).await.map_err(|e| e.to_string())
}
