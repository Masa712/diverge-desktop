# Diverge Desktop — 技術仕様書

**バージョン**: 1.0
**作成日**: 2026-04-06
**ステータス**: ドラフト

---

## 1. システムアーキテクチャ

### 1.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                   Diverge Desktop (Tauri)                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Frontend (WebView)                   │   │
│  │   React + TypeScript + Tailwind CSS + React Flow  │   │
│  └─────────────────┬────────────────────────────────┘   │
│                    │ Tauri IPC (invoke / events)         │
│  ┌─────────────────▼────────────────────────────────┐   │
│  │              Backend (Rust Core)                  │   │
│  │   ・セッション管理 (SQLite via rusqlite)           │   │
│  │   ・設定管理 (TOML)                               │   │
│  │   ・Ollama クライアント (HTTP)                    │   │
│  │   ・OpenRouter クライアント (HTTP, optional)      │   │
│  │   ・macOSキーチェーン統合                         │   │
│  └─────────────────┬────────────────────────────────┘   │
│                    │ HTTP (localhost)                    │
└────────────────────┼────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Ollama Server     │
          │  (localhost:11434)  │
          │  ・モデル管理        │
          │  ・推論実行          │
          │  ・Metal GPU利用    │
          └─────────────────────┘
```

### 1.2 データフロー（チャット送信）

```
ユーザー入力
    │
    ▼
React Component (ChatInput)
    │ tauri::invoke("send_message")
    ▼
Rust Handler (chat.rs)
    │ HTTP POST /api/chat (Ollama API)
    ▼
Ollama Server（ストリーミングレスポンス）
    │ tauri::emit_all("stream_token")
    ▼
React Component (NodeContent) — リアルタイム更新
    │
    ▼
SQLite 保存（完了時）
```

---

## 2. 技術スタック

### 2.1 コア技術

| レイヤー | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| デスクトップフレームワーク | Tauri 2 | 2.x | 軽量・セキュア・Rust製・macOSネイティブ対応 |
| フロントエンド言語 | TypeScript | 5.x | 型安全性・Diverge Webとの共通化 |
| UIフレームワーク | React | 18.x | Diverge Webからの移植性 |
| UIスタイリング | Tailwind CSS | 3.x | Diverge Webとの共通化 |
| ツリービジュアライゼーション | React Flow | 11.x | Diverge Webからの移植 |
| 状態管理 | Zustand | 4.x | Diverge Webとの共通化 |
| バックエンド言語 | Rust | 1.75+ | Tauri標準・メモリ安全・高速 |
| ローカルDB | SQLite (rusqlite) | - | 軽量・組み込み・ファイルベース |
| ローカルLLM | Ollama API | v0.3+ | Metal GPU対応・多モデル対応 |
| ビルドツール | Vite | 5.x | 高速ビルド・HMR対応 |

### 2.2 主要Rustクレート

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
tauri-plugin-store = "2"           # 設定の永続化
tauri-plugin-shell = "2"           # Ollamaプロセス制御
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
reqwest = { version = "0.12", features = ["stream", "json"] }
tokio = { version = "1", features = ["full"] }
keyring = "2"                      # macOSキーチェーン
anyhow = "1"
uuid = { version = "1", features = ["v4"] }
```

### 2.3 主要npmパッケージ

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-store": "^2",
    "react": "^18",
    "react-dom": "^18",
    "react-flow-renderer": "^11",
    "zustand": "^4",
    "tailwindcss": "^3",
    "react-markdown": "^9",
    "react-syntax-highlighter": "^15",
    "remark-gfm": "^4",
    "remark-math": "^6",
    "rehype-katex": "^7"
  }
}
```

---

## 3. プロジェクト構造

```
diverge-desktop/
├── src-tauri/                  # Rustバックエンド
│   ├── src/
│   │   ├── main.rs             # Tauriアプリエントリポイント
│   │   ├── lib.rs              # コマンド登録
│   │   ├── commands/
│   │   │   ├── chat.rs         # チャット・ストリーミング
│   │   │   ├── sessions.rs     # セッションCRUD
│   │   │   ├── models.rs       # モデル管理
│   │   │   └── settings.rs     # 設定管理
│   │   ├── ollama/
│   │   │   ├── client.rs       # Ollama HTTP クライアント
│   │   │   ├── types.rs        # Ollama APIの型定義
│   │   │   └── stream.rs       # SSEストリーム処理
│   │   ├── db/
│   │   │   ├── mod.rs          # DB接続管理
│   │   │   ├── migrations.rs   # スキーママイグレーション
│   │   │   ├── sessions.rs     # セッションDAO
│   │   │   └── nodes.rs        # ノードDAO
│   │   └── keychain.rs         # macOSキーチェーン操作
│   ├── Cargo.toml
│   ├── tauri.conf.json         # Tauri設定
│   └── capabilities/           # パーミッション設定
│
├── src/                        # Reactフロントエンド
│   ├── main.tsx                # Reactエントリポイント
│   ├── App.tsx                 # ルートコンポーネント
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInput.tsx   # メッセージ入力
│   │   │   ├── NodeContent.tsx # ノード表示
│   │   │   └── StreamingText.tsx # ストリーミング表示
│   │   ├── tree/
│   │   │   ├── ConversationTree.tsx  # React Flowツリー
│   │   │   └── NodeCard.tsx    # ノードカードUI
│   │   ├── sidebar/
│   │   │   ├── SessionList.tsx # セッション一覧
│   │   │   └── ModelSelector.tsx # モデル選択
│   │   ├── models/
│   │   │   ├── ModelLibrary.tsx # モデルライブラリ
│   │   │   └── DownloadProgress.tsx # DL進捗
│   │   └── settings/
│   │       └── SettingsPanel.tsx # 設定画面
│   ├── stores/
│   │   ├── sessionStore.ts     # セッション状態
│   │   ├── modelStore.ts       # モデル状態
│   │   └── settingsStore.ts    # 設定状態
│   ├── hooks/
│   │   ├── useChat.ts          # チャット操作
│   │   ├── useOllama.ts        # Ollama接続管理
│   │   └── useStreaming.ts     # ストリーミング処理
│   ├── types/
│   │   ├── session.ts          # セッション・ノード型
│   │   ├── model.ts            # モデル型
│   │   └── ollama.ts           # Ollama API型
│   └── lib/
│       ├── tauri.ts            # Tauri IPC ラッパー
│       └── utils.ts            # ユーティリティ
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. データモデル

### 4.1 SQLiteスキーマ

```sql
-- セッション（会話全体）
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,         -- UUID v4
    title       TEXT NOT NULL DEFAULT '新しいセッション',
    model_id    TEXT NOT NULL,            -- 例: "llama3.2:latest"
    system_prompt TEXT,
    created_at  INTEGER NOT NULL,         -- Unix timestamp (ms)
    updated_at  INTEGER NOT NULL,
    metadata    TEXT                      -- JSON (推論パラメータなど)
);

-- ノード（個々のメッセージ）
CREATE TABLE nodes (
    id          TEXT PRIMARY KEY,         -- UUID v4
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parent_id   TEXT REFERENCES nodes(id),  -- NULLはルートノード
    role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content     TEXT NOT NULL,
    model_id    TEXT,                     -- アシスタントノードのみ
    is_streaming INTEGER DEFAULT 0,       -- 1=ストリーミング中
    token_count INTEGER,
    created_at  INTEGER NOT NULL,
    metadata    TEXT                      -- JSON (usage stats等)
);

-- インデックス
CREATE INDEX idx_nodes_session_id ON nodes(session_id);
CREATE INDEX idx_nodes_parent_id  ON nodes(parent_id);
CREATE INDEX idx_sessions_updated ON sessions(updated_at DESC);

-- 全文検索
CREATE VIRTUAL TABLE nodes_fts USING fts5(
    content,
    session_id UNINDEXED,
    node_id UNINDEXED
);
```

### 4.2 TypeScript型定義

```typescript
// types/session.ts
export interface Session {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: SessionMetadata;
}

export interface Node {
  id: string;
  sessionId: string;
  parentId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  isStreaming: boolean;
  tokenCount?: number;
  createdAt: number;
  metadata?: NodeMetadata;
  // UI用（DBには保存しない）
  children?: Node[];
  depth?: number;
}

export interface SessionMetadata {
  inferenceParams?: InferenceParams;
}

export interface InferenceParams {
  temperature?: number;
  topP?: number;
  topK?: number;
  numCtx?: number;
  repeatPenalty?: number;
  maxTokens?: number;
}
```

---

## 5. Tauri IPC API

### 5.1 コマンド一覧

```typescript
// src/lib/tauri.ts — IPCラッパー

// ── セッション管理 ──
invoke('create_session', { modelId: string, title?: string }): Promise<Session>
invoke('get_sessions'): Promise<Session[]>
invoke('get_session', { id: string }): Promise<Session>
invoke('update_session', { id: string, title?: string, systemPrompt?: string }): Promise<void>
invoke('delete_session', { id: string }): Promise<void>

// ── ノード管理 ──
invoke('get_nodes', { sessionId: string }): Promise<Node[]>
invoke('create_user_node', { sessionId: string, parentId: string | null, content: string }): Promise<Node>

// ── チャット（ストリーミング） ──
invoke('send_message', {
  sessionId: string,
  userNodeId: string,    // 作成済みユーザーノードのID
  modelId: string,
  params?: InferenceParams
}): Promise<string>    // 作成されたアシスタントノードID

// ── モデル管理 ──
invoke('list_local_models'): Promise<OllamaModel[]>
invoke('pull_model', { name: string }): Promise<void>   // イベントで進捗通知
invoke('delete_model', { name: string }): Promise<void>
invoke('list_running_models'): Promise<RunningModel[]>

// ── Ollama接続 ──
invoke('check_ollama_status'): Promise<{ running: boolean, version?: string }>
invoke('get_ollama_settings'): Promise<OllamaSettings>
invoke('update_ollama_settings', { settings: OllamaSettings }): Promise<void>

// ── 設定 ──
invoke('get_settings'): Promise<AppSettings>
invoke('update_settings', { settings: Partial<AppSettings> }): Promise<void>
invoke('get_api_key', { service: 'openrouter' }): Promise<string | null>
invoke('set_api_key', { service: 'openrouter', key: string }): Promise<void>
```

### 5.2 イベント一覧

```typescript
// Rustからフロントエンドへのイベント
listen('stream_token', (event: { nodeId: string, token: string }) => void)
listen('stream_done', (event: { nodeId: string, totalTokens: number }) => void)
listen('stream_error', (event: { nodeId: string, error: string }) => void)
listen('pull_progress', (event: {
  model: string,
  status: string,
  completed?: number,
  total?: number
}) => void)
listen('ollama_status_changed', (event: { running: boolean }) => void)
```

---

## 6. Ollama API統合

### 6.1 使用エンドポイント

| エンドポイント | メソッド | 用途 |
|-------------|---------|------|
| `GET /api/tags` | GET | インストール済みモデル一覧 |
| `GET /api/ps` | GET | 実行中モデル一覧 |
| `POST /api/pull` | POST | モデルのダウンロード（ストリーミング） |
| `DELETE /api/delete` | DELETE | モデルの削除 |
| `POST /api/chat` | POST | チャット（ストリーミング対応） |
| `GET /api/version` | GET | Ollamaバージョン確認 |

### 6.2 チャットリクエスト

```rust
// ollama/types.rs
#[derive(Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
    pub options: Option<OllamaOptions>,
}

#[derive(Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,   // "system" | "user" | "assistant"
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,  // base64エンコード画像
}

#[derive(Serialize)]
pub struct OllamaOptions {
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub top_k: Option<i32>,
    pub num_ctx: Option<i32>,
    pub repeat_penalty: Option<f32>,
    pub num_predict: Option<i32>,
}
```

### 6.3 ストリーミング処理

```rust
// ollama/stream.rs
pub async fn stream_chat(
    client: &reqwest::Client,
    base_url: &str,
    request: &ChatRequest,
    window: &tauri::Window,
    node_id: &str,
) -> Result<String> {
    let mut response = client
        .post(format!("{}/api/chat", base_url))
        .json(request)
        .send()
        .await?;

    let mut full_content = String::new();

    while let Some(chunk) = response.chunk().await? {
        let line = String::from_utf8_lossy(&chunk);
        if let Ok(data) = serde_json::from_str::<ChatResponse>(&line) {
            let token = &data.message.content;
            full_content.push_str(token);

            // フロントエンドにトークン送信
            window.emit("stream_token", json!({
                "nodeId": node_id,
                "token": token
            }))?;

            if data.done {
                window.emit("stream_done", json!({
                    "nodeId": node_id,
                    "totalTokens": data.eval_count
                }))?;
                break;
            }
        }
    }

    Ok(full_content)
}
```

---

## 7. コンテキスト構築ロジック

ノードベースUIの核心。送信時に祖先ノードを辿ってコンテキストを構築する。

```typescript
// hooks/useChat.ts
function buildContextMessages(
  nodes: Node[],
  targetNodeId: string,
  systemPrompt?: string
): ChatMessage[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const ancestors: Node[] = [];

  // 対象ノードからルートまで祖先を収集
  let current = nodeMap.get(targetNodeId);
  while (current) {
    ancestors.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }

  const messages: ChatMessage[] = [];

  // システムプロンプト
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // 祖先ノードをメッセージとして追加
  for (const node of ancestors) {
    if (node.role !== 'system') {
      messages.push({ role: node.role, content: node.content });
    }
  }

  return messages;
}
```

---

## 8. 設定管理

### 8.1 設定ファイル構造

設定は `~/Library/Application Support/diverge-desktop/settings.json` に保存（tauri-plugin-store使用）。

```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;          // デフォルト: 14
  fontFamily: string;        // デフォルト: 'system-ui'

  ollama: {
    host: string;            // デフォルト: 'http://localhost'
    port: number;            // デフォルト: 11434
    autoStart: boolean;      // デフォルト: true
  };

  inference: {
    defaultModel: string;
    defaultParams: InferenceParams;
    presets: Array<{
      name: string;
      params: InferenceParams;
    }>;
  };

  data: {
    dbPath: string;          // デフォルト: ~/Library/Application Support/diverge-desktop/
    autoSaveInterval: number; // デフォルト: 300000ms (5分)
  };
}
```

### 8.2 APIキー管理

```rust
// keychain.rs — macOSキーチェーンを使用
use keyring::Entry;

pub fn store_api_key(service: &str, key: &str) -> Result<()> {
    let entry = Entry::new("diverge-desktop", service)?;
    entry.set_password(key)?;
    Ok(())
}

pub fn get_api_key(service: &str) -> Result<Option<String>> {
    let entry = Entry::new("diverge-desktop", service)?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}
```

---

## 9. 開発環境セットアップ

### 9.1 前提条件

```bash
# Rust のインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLI
cargo install tauri-cli --version "^2"

# Node.js (v20 LTS 推奨)
# npm / pnpm

# Ollama
brew install ollama
```

### 9.2 初期化手順

```bash
# プロジェクト作成
cargo tauri init --app-name "Diverge Desktop" --window-title "Diverge" \
  --dist-dir "../dist" --dev-url "http://localhost:5173" \
  --before-dev-command "npm run dev" --before-build-command "npm run build"

# 依存関係インストール
npm install

# 開発サーバー起動
cargo tauri dev

# ビルド（Universal Binary）
cargo tauri build --target universal-apple-darwin
```

### 9.3 推奨開発ツール

- **IDE**: VS Code + rust-analyzer + Tauri Extension
- **デバッグ**: Tauri DevTools（WebViewのChrome DevTools相当）
- **DB管理**: TablePlus または DB Browser for SQLite

---

## 10. 配布・リリース

### 10.1 配布形式

- **形式**: `.dmg`（Universal Binary — Apple Silicon + Intel）
- **コード署名**: Apple Developer ID Application 証明書
- **公証 (Notarization)**: Apple公証サービスを通じた公証
- **自動アップデート**: tauri-plugin-updater（GitHub Releases経由）

### 10.2 ビルド・リリースフロー

```
git tag v1.0.0
    │
    ▼
GitHub Actions
    │
    ├── cargo tauri build --target universal-apple-darwin
    │
    ├── codesign --deep --force --sign "Developer ID Application: ..."
    │
    ├── xcrun notarytool submit ... --wait
    │
    ├── xcrun stapler staple ...
    │
    └── GitHub Release に .dmg をアップロード
```

### 10.3 GitHub Actions設定（`.github/workflows/release.yml`）

主要ステップ:
1. `macos-latest` ランナーで Universal Binary ビルド
2. Apple Developer証明書でコード署名
3. Apple公証
4. GitHub Releaseに成果物アップロード
5. `latest.json`（自動アップデート用マニフェスト）の更新

---

## 11. パフォーマンス最適化

### 11.1 起動時間の最適化

- Reactの遅延読み込み（`React.lazy`）でバンドル分割
- Ollamaの接続確認を非同期で並行実行
- SQLiteのWALモード有効化（書き込みパフォーマンス向上）

### 11.2 ストリーミングのスロットリング

```typescript
// 過剰な再レンダリングを防ぐバッファリング
const FLUSH_INTERVAL_MS = 50;

function useStreamingBuffer(nodeId: string) {
  const buffer = useRef('');
  const timer = useRef<number>();

  useEffect(() => {
    const unlisten = listen('stream_token', ({ payload }) => {
      if (payload.nodeId !== nodeId) return;
      buffer.current += payload.token;

      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        updateNodeContent(nodeId, buffer.current);
      }, FLUSH_INTERVAL_MS);
    });

    return () => { unlisten.then(f => f()); };
  }, [nodeId]);
}
```

---

## 12. テスト戦略

| テスト種別 | ツール | 対象 |
|-----------|-------|------|
| Rustユニットテスト | `cargo test` | DB操作、Ollamaクライアント、コンテキスト構築 |
| フロントエンドユニットテスト | Vitest | stores、hooks、ユーティリティ |
| コンポーネントテスト | Testing Library | React コンポーネント |
| E2Eテスト | Tauri + Playwright | 主要ユーザーフロー |

---

## 13. セキュリティ考慮事項

### 13.1 Tauri CSP設定

```json
// tauri.conf.json
{
  "security": {
    "csp": "default-src 'self'; script-src 'self'; connect-src http://localhost:11434 https://openrouter.ai",
    "dangerousDisableAssetCspModification": false
  }
}
```

### 13.2 IPC権限管理

```json
// capabilities/default.json
{
  "permissions": [
    "core:default",
    "shell:allow-open",
    "store:default",
    "http:default"
  ]
}
```

- フロントエンドから直接ファイルシステムやシェルにアクセスさせない
- 全ての外部通信はRustコマンド経由に限定
- Ollamaのホスト設定はRust側で検証（SSRF対策）
