import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useModelStore } from '@/stores/modelStore'

export function SessionList() {
  const { sessions, activeSessionId, selectSession, createSession, deleteSession, loadSessions } =
    useSessionStore()
  const selectedModel = useModelStore((s) => s.selectedModel)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function handleNew() {
    if (!selectedModel) return
    const session = await createSession(selectedModel)
    selectSession(session.id)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Sessions
        </span>
        <button
          onClick={handleNew}
          disabled={!selectedModel}
          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30"
          title="New session"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <p className="text-xs text-white/30 text-center mt-6 px-3">
            セッションがありません
          </p>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              title={session.title}
              isActive={session.id === activeSessionId}
              onClick={() => selectSession(session.id)}
              onDelete={() => deleteSession(session.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SessionItemProps {
  title: string
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

function SessionItem({ title, isActive, onClick, onDelete }: SessionItemProps) {
  return (
    <div
      className={`group flex items-center gap-1 px-3 py-2 cursor-pointer text-sm transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/60 hover:bg-white/5 hover:text-white/80'
      }`}
      onClick={onClick}
    >
      <span className="flex-1 truncate">{title}</span>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
