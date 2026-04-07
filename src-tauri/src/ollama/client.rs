use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::json;

use super::types::{OllamaModel, PsResponse, RunningModel, TagsResponse, VersionResponse};

#[derive(Clone)]
pub struct OllamaClient {
    pub base_url: String,
    client: Client,
}

impl OllamaClient {
    pub fn new(host: &str, port: u16) -> Self {
        Self {
            base_url: format!("{}:{}", host, port),
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .expect("Failed to build HTTP client"),
        }
    }

    pub fn http_client(&self) -> &Client {
        &self.client
    }

    /// Ollama が起動しているか確認し、バージョンを返す
    pub async fn check_status(&self) -> Result<Option<String>> {
        let url = format!("{}/api/version", self.base_url);
        match self.client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let ver: VersionResponse = resp.json().await?;
                Ok(Some(ver.version))
            }
            _ => Ok(None),
        }
    }

    /// インストール済みモデル一覧
    pub async fn list_models(&self) -> Result<Vec<OllamaModel>> {
        let url = format!("{}/api/tags", self.base_url);
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            return Err(anyhow!("Failed to list models: {}", resp.status()));
        }
        let tags: TagsResponse = resp.json().await?;
        Ok(tags.models)
    }

    /// 実行中モデル一覧
    pub async fn list_running(&self) -> Result<Vec<RunningModel>> {
        let url = format!("{}/api/ps", self.base_url);
        let resp = self.client.get(&url).send().await?;
        if !resp.status().is_success() {
            return Err(anyhow!("Failed to list running models: {}", resp.status()));
        }
        let ps: PsResponse = resp.json().await?;
        Ok(ps.models)
    }

    /// モデルの削除
    pub async fn delete_model(&self, name: &str) -> Result<()> {
        let url = format!("{}/api/delete", self.base_url);
        let resp = self
            .client
            .delete(&url)
            .json(&json!({ "name": name }))
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(anyhow!("Failed to delete model: {}", resp.status()));
        }
        Ok(())
    }
}
