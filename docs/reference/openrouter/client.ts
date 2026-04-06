import { ModelId } from '@/types'
import { ToolCall } from './function-calling'

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string  // For tool response messages
  tool_calls?: ToolCall[] // For assistant messages with tool calls
}

export interface OpenRouterRequest {
  model: ModelId
  messages: OpenRouterMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
  transforms?: string[]
  tools?: any[]  // Tool definitions for function calling
  tool_choice?: 'auto' | 'none' | { type: 'function', function: { name: string } }
  reasoning?: {
    effort?: 'low' | 'medium' | 'high'
    max_tokens?: number
    exclude?: boolean
    enabled?: boolean
  }
}

export interface OpenRouterResponse {
  id: string
  model: string
  object: string
  created: number
  choices: {
    index: number
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]  // For function calling responses
    }
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Models that do NOT support reasoning parameter
const NON_REASONING_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-oss-120b'
]

// Check if a model supports reasoning parameter
export function supportsReasoning(model: ModelId): boolean {
  // Check if model starts with any of the non-reasoning model prefixes
  return !NON_REASONING_MODELS.some(nonReasoningModel => model.startsWith(nonReasoningModel))
}

// Get reasoning configuration based on model provider and effort level
export function getReasoningConfig(model: ModelId, effort: 'low' | 'medium' | 'high' = 'high') {
  // OpenAI models (o1, o3, GPT-5 series) - use effort-based approach
  if (model.startsWith('openai/o1') || model.startsWith('openai/o3') || model.includes('gpt-5')) {
    return {
      effort: effort,
      exclude: false  // Include reasoning in response for better transparency
    }
  }
  
  // Grok models - use effort-based approach
  if (model.startsWith('x-ai/grok')) {
    return {
      effort: effort,
      exclude: false
    }
  }
  
  // Anthropic models (Claude) - use max_tokens approach
  if (model.startsWith('anthropic/claude')) {
    const tokenMap = {
      'low': 2000,
      'medium': 4000,
      'high': 8000
    }
    return {
      max_tokens: tokenMap[effort],
      exclude: false
    }
  }
  
  // Google Gemini models - use max_tokens approach
  if (model.includes('gemini')) {
    const tokenMap = {
      'low': 1500,
      'medium': 3000,
      'high': 6000
    }
    return {
      max_tokens: tokenMap[effort],
      exclude: false
    }
  }
  
  // Default fallback - use effort-based
  return {
    effort: effort,
    exclude: false
  }
}

export class OpenRouterClient {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'
  private siteUrl?: string
  private siteName?: string

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set')
    }
    this.apiKey = apiKey
    this.siteUrl = process.env.OPENROUTER_SITE_URL
    this.siteName = process.env.OPENROUTER_SITE_NAME
  }

  async createChatCompletion(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }

    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl
    }
    if (this.siteName) {
      headers['X-Title'] = this.siteName
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async createStreamingChatCompletion(
    request: OpenRouterRequest,
    onChunk: (chunk: string) => void,
    timeoutMs: number = 30000
  ): Promise<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }

    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl
    }
    if (this.siteName) {
      headers['X-Title'] = this.siteName
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            return usage
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              onChunk(content)
            }
            // Capture usage from the final chunk (empty choices + usage object)
            if (parsed.usage) {
              usage = {
                prompt_tokens: parsed.usage.prompt_tokens || 0,
                completion_tokens: parsed.usage.completion_tokens || 0,
                total_tokens: parsed.usage.total_tokens || 0,
              }
            }
          } catch (e) {
            console.error('Error parsing SSE chunk:', e)
          }
        }
      }
    }

    return usage
  }

  // Get available models from OpenRouter
  async getModels() {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models from OpenRouter')
    }

    return response.json()
  }
}