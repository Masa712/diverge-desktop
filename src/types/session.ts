// Desktop-specific types matching the Tauri IPC / SQLite schema

export interface Session {
  id: string
  title: string
  modelId: string
  systemPrompt?: string
  createdAt: number
  updatedAt: number
  metadata?: SessionMetadata
}

export interface SessionMetadata {
  inferenceParams?: InferenceParams
}

export type NodeRole = 'user' | 'assistant' | 'system'

export interface Node {
  id: string
  sessionId: string
  parentId: string | null
  role: NodeRole
  content: string
  modelId?: string
  isStreaming: boolean
  tokenCount?: number
  createdAt: number
  metadata?: NodeMetadata
}

export interface NodeMetadata {
  usageStats?: {
    promptTokens?: number
    completionTokens?: number
  }
}

export interface InferenceParams {
  temperature?: number
  topP?: number
  topK?: number
  numCtx?: number
  repeatPenalty?: number
  maxTokens?: number
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: number
  fontFamily: string
  ollama: {
    host: string
    port: number
  }
  inference: {
    defaultModel: string
    defaultParams: InferenceParams
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'system-ui',
  ollama: {
    host: 'http://localhost',
    port: 11434,
  },
  inference: {
    defaultModel: '',
    defaultParams: {
      temperature: 0.7,
      numCtx: 4096,
    },
  },
}
