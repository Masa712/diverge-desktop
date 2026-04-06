'use client'

import { ModelId, ModelConfig } from '@/types'

interface Props {
  selectedModel: ModelId
  onModelChange: (model: ModelId) => void
  availableModels: ModelConfig[]
  compact?: boolean
  disabled?: boolean
}

export function ModelSelector({ selectedModel, onModelChange, availableModels, compact = false, disabled = false }: Props) {
  const selectedModelConfig = availableModels.find(m => m.id === selectedModel)

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, ModelConfig[]>)

  // Sort providers alphabetically
  const sortedProviders = Object.keys(modelsByProvider).sort()

  if (compact) {
    return (
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelId)}
        disabled={disabled}
        className="rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-xs text-gray-700 focus:bg-white/20 focus:border-white/30 focus:outline-none transition-all duration-200 text-right disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? 'Loading subscription plan...' : undefined}
      >
        {sortedProviders.map((provider) => (
          <optgroup key={provider} label={provider}>
            {modelsByProvider[provider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-2">
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelId)}
        disabled={disabled}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? 'Loading subscription plan...' : undefined}
      >
        {sortedProviders.map((provider) => (
          <optgroup key={provider} label={provider}>
            {modelsByProvider[provider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.contextLength.toLocaleString()} tokens
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedModelConfig && (
        <div className="text-xs text-muted-foreground">
          <div>Provider: {selectedModelConfig.provider}</div>
          <div>{selectedModelConfig.contextLength.toLocaleString()} tokens</div>
          <div>
            ${selectedModelConfig.costPerMillionTokens.input}/${selectedModelConfig.costPerMillionTokens.output} per 1M tokens
          </div>
        </div>
      )}
    </div>
  )
}