use std::sync::Mutex;

use anyhow::Result;
use rusqlite::Connection;
use tauri::State;

use crate::db::sessions::{self, Session};

pub struct DbState(pub Mutex<Connection>);

#[tauri::command]
pub async fn create_session(
    db: State<'_, DbState>,
    model_id: String,
    title: Option<String>,
) -> Result<Session, String> {
    let conn = db.0.lock().unwrap();
    sessions::create_session(&conn, &model_id, title.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sessions(db: State<'_, DbState>) -> Result<Vec<Session>, String> {
    let conn = db.0.lock().unwrap();
    sessions::list_sessions(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_session(db: State<'_, DbState>, id: String) -> Result<Session, String> {
    let conn = db.0.lock().unwrap();
    sessions::get_session(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_session(
    db: State<'_, DbState>,
    id: String,
    title: Option<String>,
    system_prompt: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    sessions::update_session(&conn, &id, title.as_deref(), system_prompt.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_session(db: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().unwrap();
    sessions::delete_session(&conn, &id).map_err(|e| e.to_string())
}
