pub mod migrations;
pub mod nodes;
pub mod sessions;

use anyhow::Result;
use rusqlite::Connection;
use std::path::Path;

pub fn init_db(data_dir: &Path) -> Result<Connection> {
    std::fs::create_dir_all(data_dir)?;
    let db_path = data_dir.join("diverge.db");
    let conn = Connection::open(db_path)?;

    // WAL モードで書き込みパフォーマンスを向上
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    migrations::run_migrations(&conn)?;
    Ok(conn)
}
