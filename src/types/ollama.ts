// Ollama API types

export interface OllamaModelDetails {
  family: string
  families?: string[]
  parameterSize: string
  quantizationLevel: string
  format?: string
}

export interface OllamaModel {
  name: string
  size: number
  digest: string
  modifiedAt: string
  details: OllamaModelDetails
}

export interface RunningModel {
  name: string
  size: number
  sizeVram: number
  expiresAt: string
}

export interface OllamaStatus {
  running: boolean
  version?: string
}

export interface PullProgress {
  model: string
  status: string
  completed?: number
  total?: number
}
