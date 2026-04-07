import { useModelStore } from '@/stores/modelStore'

export function OllamaStatusBanner() {
  const ollamaStatus = useModelStore((s) => s.ollamaStatus)
  const checkStatus = useModelStore((s) => s.checkStatus)

  if (ollamaStatus.running) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/40 border-b border-amber-700/40 text-amber-300 text-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>
        Ollama が起動していません。
        <code className="mx-1 bg-white/10 px-1 py-0.5 rounded text-xs">ollama serve</code>
        を実行してください。
      </span>
      <button
        onClick={checkStatus}
        className="ml-auto text-xs underline hover:no-underline"
      >
        再確認
      </button>
    </div>
  )
}
