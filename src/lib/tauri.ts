import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import type { Session, Node, InferenceParams, AppSettings } from '@/types/session'
import type { OllamaModel, RunningModel, OllamaStatus, PullProgress } from '@/types/ollama'

// ── セッション管理 ──────────────────────────────────────────────────────────

export function createSession(modelId: string, title?: string): Promise<Session> {
  return invoke('create_session', { modelId, title })
}

export function getSessions(): Promise<Session[]> {
  return invoke('get_sessions')
}

export function getSession(id: string): Promise<Session> {
  return invoke('get_session', { id })
}

export function updateSession(id: string, updates: { title?: string; systemPrompt?: string }): Promise<void> {
  return invoke('update_session', { id, ...updates })
}

export function deleteSession(id: string): Promise<void> {
  return invoke('delete_session', { id })
}

// ── ノード管理 ──────────────────────────────────────────────────────────────

export function getNodes(sessionId: string): Promise<Node[]> {
  return invoke('get_nodes', { sessionId })
}

export function createUserNode(sessionId: string, parentId: string | null, content: string): Promise<Node> {
  return invoke('create_user_node', { sessionId, parentId, content })
}

// ── チャット（ストリーミング） ────────────────────────────────────────────────

export function stopGeneration(): Promise<void> {
  return invoke('stop_generation')
}

export function sendMessage(
  sessionId: string,
  userNodeId: string,
  modelId: string,
  params?: InferenceParams,
): Promise<string> {
  return invoke('send_message', { sessionId, userNodeId, modelId, params })
}

// ── モデル管理 ──────────────────────────────────────────────────────────────

export function listLocalModels(): Promise<OllamaModel[]> {
  return invoke('list_local_models')
}

export function pullModel(name: string): Promise<void> {
  return invoke('pull_model', { name })
}

export function deleteModel(name: string): Promise<void> {
  return invoke('delete_model', { name })
}

export function listRunningModels(): Promise<RunningModel[]> {
  return invoke('list_running_models')
}

// ── Ollama 接続 ─────────────────────────────────────────────────────────────

export function checkOllamaStatus(): Promise<OllamaStatus> {
  return invoke('check_ollama_status')
}

// ── 設定 ────────────────────────────────────────────────────────────────────

export function getSettings(): Promise<AppSettings> {
  return invoke('get_settings')
}

export function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  return invoke('update_settings', { settings })
}

export function getApiKey(service: string): Promise<string | null> {
  return invoke('get_api_key', { service })
}

export function setApiKey(service: string, key: string): Promise<void> {
  return invoke('set_api_key', { service, key })
}

// ── イベント ────────────────────────────────────────────────────────────────

export interface StreamTokenPayload {
  nodeId: string
  token: string
}

export interface StreamDonePayload {
  nodeId: string
  totalTokens: number
}

export interface StreamErrorPayload {
  nodeId: string
  error: string
}

export function onStreamToken(handler: (payload: StreamTokenPayload) => void): Promise<UnlistenFn> {
  return listen<StreamTokenPayload>('stream_token', (e) => handler(e.payload))
}

export function onStreamDone(handler: (payload: StreamDonePayload) => void): Promise<UnlistenFn> {
  return listen<StreamDonePayload>('stream_done', (e) => handler(e.payload))
}

export function onStreamError(handler: (payload: StreamErrorPayload) => void): Promise<UnlistenFn> {
  return listen<StreamErrorPayload>('stream_error', (e) => handler(e.payload))
}

export function onPullProgress(handler: (payload: PullProgress) => void): Promise<UnlistenFn> {
  return listen<PullProgress>('pull_progress', (e) => handler(e.payload))
}

export function onOllamaStatusChanged(handler: (payload: OllamaStatus) => void): Promise<UnlistenFn> {
  return listen<OllamaStatus>('ollama_status_changed', (e) => handler(e.payload))
}
