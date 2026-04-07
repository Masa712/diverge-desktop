'use client'

import type { OllamaModel } from '@/types/ollama'

interface Props {
  models: OllamaModel[]
  selected: string
  onChange: (name: string) => void
  disabled?: boolean
}

export function ModelSelector({ models, selected, onChange, disabled = false }: Props) {
  // family ごとにグループ化
  const byFamily = models.reduce<Record<string, OllamaModel[]>>((acc, model) => {
    const family = model.details?.family || 'Other'
    if (!acc[family]) acc[family] = []
    acc[family].push(model)
    return acc
  }, {})

  const families = Object.keys(byFamily).sort()

  if (models.length === 0) {
    return (
      <span className="text-xs text-white/40">
        モデルなし
      </span>
    )
  }

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-white/30 disabled:opacity-50"
    >
      {families.map((family) => (
        <optgroup key={family} label={family}>
          {byFamily[family].map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
              {m.details?.parameterSize ? ` (${m.details.parameterSize})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
