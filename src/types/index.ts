export type ModelProvider = 'OpenAI' | 'Anthropic' | 'Google' | 'xAI' | 'DeepSeek'

export type ModelId =
  // OpenAI Latest Models via OpenRouter
  | 'openai/gpt-5.4-pro'
  | 'openai/gpt-5.4'
  | 'openai/gpt-5.3-chat'
  | 'openai/gpt-5.3-codex'
  | 'openai/gpt-5.2'
  | 'openai/gpt-5.2-pro'
  | 'openai/gpt-5.1'
  | 'openai/gpt-5-pro'
  | 'openai/gpt-5'
  | 'openai/gpt-5-mini'
  | 'openai/gpt-5-nano'
  | 'openai/gpt-oss-120b'
  | 'openai/o3'
  | 'openai/gpt-4.1'
  | 'openai/gpt-4o-2024-11-20'
  // Anthropic Latest Models via OpenRouter
  | 'anthropic/claude-opus-4.6'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-opus-4.5'
  | 'anthropic/claude-haiku-4.5'
  | 'anthropic/claude-sonnet-4.5'
  | 'anthropic/claude-opus-4.1'
  | 'anthropic/claude-opus-4'
  | 'anthropic/claude-sonnet-4'
  // Google Latest Models via OpenRouter
  | 'google/gemini-3.1-pro-preview'
  | 'google/gemini-3.1-flash-lite-preview'
  | 'google/gemini-3-flash-preview'
  | 'google/gemini-2.5-flash'
  | 'google/gemini-2.5-pro'
  // xAI Latest Models via OpenRouter (Note: x-ai with hyphen, not xai)
  | 'x-ai/grok-4.1-fast'
  | 'x-ai/grok-4'
  | 'x-ai/grok-4-fast'
  | 'x-ai/grok-3'
  | 'x-ai/grok-3-mini'
  // DeepSeek Latest Models via OpenRouter
  | 'deepseek/deepseek-v3.2'
  | 'deepseek/deepseek-chat-v3.1'

// Model configuration with OpenRouter
export interface ModelConfig {
  id: ModelId
  name: string
  provider: string
  contextLength: number
  costPerMillionTokens: {
    input: number
    output: number
  }
}

// Available models via OpenRouter
export const AVAILABLE_MODELS: ModelConfig[] = [
  // Anthropic Latest Models
  {
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6',
    provider: 'Anthropic',
    contextLength: 1000000,
    costPerMillionTokens: { input: 5, output: 25 }
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    contextLength: 1000000,
    costPerMillionTokens: { input: 3, output: 15 }
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    contextLength: 200000,
    costPerMillionTokens: { input: 5, output: 25 }
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    contextLength: 200000,
    costPerMillionTokens: { input: 1, output: 5 }
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    contextLength: 1000000,
    costPerMillionTokens: { input: 3, output: 15 }
  },
  {
    id: 'anthropic/claude-opus-4.1',
    name: 'Claude Opus 4.1',
    provider: 'Anthropic',
    contextLength: 400000,
    costPerMillionTokens: { input: 25, output: 100 }
  },
  {
    id: 'anthropic/claude-opus-4',
    name: 'Claude Opus 4',
    provider: 'Anthropic',
    contextLength: 300000,
    costPerMillionTokens: { input: 20, output: 80 }
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    contextLength: 250000,
    costPerMillionTokens: { input: 8, output: 32 }
  },
  // DeepSeek Latest Models
  {
    id: 'deepseek/deepseek-v3.2',
    name: 'DeepSeek V3.2',
    provider: 'DeepSeek',
    contextLength: 163840,
    costPerMillionTokens: { input: 0.25, output: 0.38 }
  },
  {
    id: 'deepseek/deepseek-chat-v3.1',
    name: 'DeepSeek V3.1',
    provider: 'DeepSeek',
    contextLength: 164000,
    costPerMillionTokens: { input: 0.27, output: 1.10 }
  },
  // Google Latest Models
  {
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    contextLength: 1048576,
    costPerMillionTokens: { input: 2, output: 12 }
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    contextLength: 1048576,
    costPerMillionTokens: { input: 0.25, output: 1.50 }
  },
  {
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    contextLength: 1048576,
    costPerMillionTokens: { input: 0.50, output: 3.00 }
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    contextLength: 2000000,
    costPerMillionTokens: { input: 2.5, output: 7.5 }
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    contextLength: 1000000,
    costPerMillionTokens: { input: 0.25, output: 0.75 }
  },
  // OpenAI Latest Models
  {
    id: 'openai/gpt-5.4-pro',
    name: 'GPT-5.4 Pro',
    provider: 'OpenAI',
    contextLength: 1050000,
    costPerMillionTokens: { input: 30, output: 180 }
  },
  {
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4',
    provider: 'OpenAI',
    contextLength: 1050000,
    costPerMillionTokens: { input: 2.50, output: 15 }
  },
  {
    id: 'openai/gpt-5.3-chat',
    name: 'GPT-5.3 Chat',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 1.75, output: 14 }
  },
  {
    id: 'openai/gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 1.75, output: 14 }
  },
  {
    id: 'openai/gpt-5.2',
    name: 'GPT 5.2',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 1.75, output: 14 }
  },
  {
    id: 'openai/gpt-5.2-pro',
    name: 'GPT 5.2 Pro',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 21, output: 168 }
  },
  {
    id: 'openai/gpt-5.1',
    name: 'GPT 5.1',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 1.25, output: 10 }
  },
  {
    id: 'openai/gpt-5-pro',
    name: 'GPT 5 Pro',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 15, output: 120 }
  },
  {
    id: 'openai/gpt-5',
    name: 'GPT 5',
    provider: 'OpenAI',
    contextLength: 256000,
    costPerMillionTokens: { input: 20, output: 60 }
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 8, output: 24 }
  },
  {
    id: 'openai/gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'OpenAI',
    contextLength: 400000,
    costPerMillionTokens: { input: 0.05, output: 0.4 }
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 5, output: 15 }
  },
  {
    id: 'openai/o3',
    name: 'O3',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 15, output: 45 }
  },
  {
    id: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 12, output: 36 }
  },
  {
    id: 'openai/gpt-4o-2024-11-20',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLength: 128000,
    costPerMillionTokens: { input: 5, output: 15 }
  },
  // xAI Latest Models
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast',
    provider: 'xAI',
    contextLength: 2000000,
    costPerMillionTokens: { input: 0.20, output: 0.50 }
  },
  {
    id: 'x-ai/grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    contextLength: 256000,
    costPerMillionTokens: { input: 18, output: 54 }
  },
  {
    id: 'x-ai/grok-4-fast',
    name: 'Grok 4 Fast',
    provider: 'xAI',
    contextLength: 2000000,
    costPerMillionTokens: { input: 10, output: 30 }
  },
  {
    id: 'x-ai/grok-3',
    name: 'Grok 3',
    provider: 'xAI',
    contextLength: 131000,
    costPerMillionTokens: { input: 10, output: 30 }
  },
  {
    id: 'x-ai/grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xAI',
    contextLength: 131000,
    costPerMillionTokens: { input: 0.3, output: 0.5 }
  },
]

export type NodeStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled'

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
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  name: string
  description: string | null
  userId: string
  rootNodeId: string | null
  totalCostUsd: number
  totalTokens: number
  nodeCount: number
  maxDepth: number
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
  lastAccessedAt: Date
  lastNodeCreatedAt: Date | null
}

export interface UsageLog {
  id: string
  userId: string
  sessionId: string
  nodeId: string
  model: ModelId
  action: 'generate' | 'retry' | 'branch'
  promptTokens: number
  completionTokens: number
  costUsd: number
  latencyMs: number
  cacheHit: boolean
  createdAt: Date
}

export interface ContextCache {
  id: string
  nodeId: string
  contextHash: string
  context: string
  tokenCount: number
  expiresAt: Date
  createdAt: Date
}

export interface UserQuota {
  id: string
  userId: string
  periodStart: Date
  periodEnd: Date
  tokenQuota: number
  tokensUsed: number
  costQuotaUsd: number
  costUsedUsd: number
  updatedAt: Date
}

export interface TreeNode {
  node: ChatNode
  children: TreeNode[]
}

export interface GenerateRequest {
  nodeId?: string
  parentId?: string
  sessionId: string
  prompt: string
  model?: ModelId
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface GenerateResponse {
  node: ChatNode
  contextUsed: string[]
  cacheHit: boolean
}

export interface UserProfile {
  id?: string
  user_id?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  default_model?: ModelId
  default_temperature?: number
  default_max_tokens?: number
  subscription_plan?: string
  preferences?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}