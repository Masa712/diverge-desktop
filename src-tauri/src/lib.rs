mod commands;
mod db;
mod keychain;
mod ollama;

use commands::sessions::DbState;
use ollama::client::OllamaClient;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // アプリデータディレクトリに SQLite DB を初期化
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let conn = db::init_db(&data_dir).expect("Failed to initialize database");

            // Ollama クライアントを初期化（デフォルト: localhost:11434）
            let ollama = OllamaClient::new("http://localhost", 11434);

            app.manage(DbState(Mutex::new(conn)));
            app.manage(ollama);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // セッション管理
            commands::sessions::create_session,
            commands::sessions::get_sessions,
            commands::sessions::get_session,
            commands::sessions::update_session,
            commands::sessions::delete_session,
            // チャット・ノード
            commands::chat::get_nodes,
            commands::chat::create_user_node,
            commands::chat::send_message,
            // モデル管理
            commands::models::list_local_models,
            commands::models::list_running_models,
            commands::models::pull_model,
            commands::models::delete_model,
            // 設定
            commands::settings::check_ollama_status,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::get_api_key,
            commands::settings::set_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
