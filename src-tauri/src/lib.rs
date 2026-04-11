mod commands;
mod db;
mod keychain;
mod ollama;

use commands::sessions::DbState;
pub use commands::chat::StopFlag;
use ollama::client::OllamaClient;
use std::sync::Mutex;
use tauri::Manager;

/// Ollama が起動していなければ `ollama serve` をバックグラウンドで起動する。
/// 起動後、最大 10 秒間ポーリングして接続を待つ。
fn ensure_ollama_running() {
    // 既に起動中か確認（同期的に HTTP チェック）
    if std::net::TcpStream::connect_timeout(
        &"127.0.0.1:11434".parse().unwrap(),
        std::time::Duration::from_secs(1),
    )
    .is_ok()
    {
        eprintln!("[ollama] already running");
        return;
    }

    eprintln!("[ollama] not running, starting ollama serve...");
    let result = std::process::Command::new("ollama")
        .arg("serve")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();

    match result {
        Ok(_child) => {
            eprintln!("[ollama] process spawned, waiting for port 11434...");
            // 最大 10 秒間、500ms ごとにポーリング
            for i in 0..20 {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if std::net::TcpStream::connect_timeout(
                    &"127.0.0.1:11434".parse().unwrap(),
                    std::time::Duration::from_millis(200),
                )
                .is_ok()
                {
                    eprintln!("[ollama] ready after {}ms", (i + 1) * 500);
                    return;
                }
            }
            eprintln!("[ollama] timeout waiting for ollama to start");
        }
        Err(e) => {
            eprintln!("[ollama] failed to spawn ollama serve: {}", e);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Ollama が起動していなければ自動起動
            ensure_ollama_running();

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
            app.manage(StopFlag::new());

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
            commands::chat::stop_generation,
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
