// Ollama uses arbitrary model name strings (e.g. "llama3.2:latest")
export type ModelId = string

export type ModelProvider = string

export interface ModelConfig {
  id: ModelId
  name: string
  provider: string
  contextLength: number
  costPerMillionTokens?: {
    input: number
    output: number
  }
}

export type NodeStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled'

// ChatNode is the display type used by tree components (BalancedTreeView etc.)
// It represents a user prompt + optional assistant response pair.
export interface ChatNode {
  id: string
  parentId: string | null
  sessionId: string
  model: ModelId
  systemPrompt: string | null
  prompt: string
  response: string | null
  status: NodeStatus
  errorMessage: string | null
  depth: number
  promptTokens: number
  responseTokens: number
  costUsd: number
  temperature: number | null
  maxTokens: number | null
  topP: number | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface TreeNode {
  node: ChatNode
  children: TreeNode[]
}
