# Diverge Desktop — Claude Code ガイド

## プロジェクト概要

**Diverge Desktop** は、macOSデスクトップ向けのノードベース分岐型AIチャットアプリ。
Tauri 2（Rust）+ React + TypeScript + Ollama によるローカルLLM実行環境を提供する。

**Diverge Web**（`~/Projects/Application/Diverge`）からUIコンポーネントを移植しながら開発する。

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| デスクトップフレームワーク | Tauri 2 |
| フロントエンド | React 19 + TypeScript 5 + Tailwind CSS + React Flow |
| 状態管理 | Zustand |
| バックエンド | Rust（Tauri コマンド） |
| ローカルDB | SQLite（rusqlite） |
| ローカルLLM | Ollama API（localhost:11434） |
| ビルド | Vite 7 |

---

## 開発コマンド

```bash
# 開発サーバー起動（フロントエンド + Tauriアプリ）
npm run tauri dev
# または
cargo tauri dev

# フロントエンドのみビルド確認
npm run build

# TypeScript型チェック
npx tsc --noEmit

# Rustテスト
cargo test --manifest-path src-tauri/Cargo.toml

# Universal Binaryビルド（リリース）
cargo tauri build --target universal-apple-darwin
```

> Ollamaが起動している必要がある: `ollama serve`

---

## プロジェクト構造

```
diverge-desktop/
├── src-tauri/src/
│   ├── commands/       # Tauri IPCコマンド (chat.rs, sessions.rs, models.rs, settings.rs)
│   ├── ollama/         # Ollamaクライアント (client.rs, types.rs, stream.rs)
│   ├── db/             # SQLite DAO (mod.rs, migrations.rs, sessions.rs, nodes.rs)
│   └── keychain.rs     # macOSキーチェーン
├── src/
│   ├── components/
│   │   ├── tree/       # React Flowノードツリー（Diverge Webからの移植核心）
│   │   ├── chat/       # チャット入力・ノード表示
│   │   ├── sidebar/    # セッション一覧・モデル選択
│   │   └── settings/   # 設定画面
│   ├── stores/         # Zustandストア
│   ├── hooks/          # useChat, useOllama, useStreaming
│   ├── types/          # TypeScript型定義
│   └── lib/tauri.ts    # Tauri IPC ラッパー
└── docs/
    ├── REQUIREMENTS.md
    ├── TECHNICAL_SPECIFICATION.md
    └── reference/      # Diverge Webから参照用ファイル（直接使用しない）
```

---

## Tauri IPC パターン

フロントエンドからRustへの呼び出しは必ず `invoke` を使う:

```typescript
import { invoke } from '@tauri-apps/api/core'

// セッション作成
const session = await invoke('create_session', { modelId: 'llama3.2:latest' })

// チャット送信（ストリーミングはイベント経由）
const nodeId = await invoke('send_message', { sessionId, userNodeId, modelId })

// イベントリスン
import { listen } from '@tauri-apps/api/event'
const unlisten = await listen('stream_token', ({ payload }) => { ... })
```

---

## Diverge Web からの移植ルール

| ステータス | 説明 |
|-----------|------|
| ✅ そのまま使用可 | インポートパスのみ確認 |
| 🔧 インポートパス修正 | `@/` エイリアス → 相対パスまたは tsconfig paths |
| ✏️ 一部修正必要 | Supabase/API fetch → `invoke()` に変更 |
| 📚 参照のみ | `docs/reference/` にあるファイル、直接使わない |

**重要な移植ファイル:**
- `src/components/tree/BalancedTreeView.tsx` — React Flowツリー（🔧）
- `src/components/tree/chat-tree-view.tsx` — データ取得をinvokeに変更（✏️）
- `src/components/chat/chat-input.tsx` — next/router・認証削除（✏️）
- `src/components/ui/MarkdownRenderer.tsx` — 依存パッケージ追加後そのまま（🔧）

---

## データモデル（主要型）

```typescript
// セッション = ノードツリー全体
interface Session { id, title, modelId, systemPrompt, createdAt, updatedAt }

// ノード = 1メッセージ（ツリー構造）
interface Node {
  id, sessionId, parentId: string | null,
  role: 'user' | 'assistant' | 'system',
  content, isStreaming, tokenCount, createdAt
}

// 推論パラメータ
interface InferenceParams { temperature, topP, topK, numCtx, repeatPenalty, maxTokens }
```

---

## 開発フェーズ

- **Phase 1（MVP）**: Ollama連携・基本チャット・セッション保存・モデル管理
- **Phase 2**: ファイル添付・OpenRouter連携・推論パラメータ設定・検索
- **Phase 3**: RAG・Fine-tuning・プラグイン

---

## 注意事項

- **Ollama必須**: アプリ起動前に `ollama serve` でOllamaサーバーを起動
- **SQLite保存先**: `~/Library/Application Support/diverge-desktop/`
- **APIキー**: macOSキーチェーンに保存（`keychain.rs`）
- **ストリーミング**: Rustが `stream_token` イベントを50msバッファリングで送信
- **コンテキスト構築**: チャット送信時、祖先ノードを遡ってメッセージ列を構築（`hooks/useChat.ts`）
