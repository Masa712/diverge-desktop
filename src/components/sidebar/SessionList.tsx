import { useEffect } from 'react'
import { useSessionStore } from '@/stores/sessionStore'

export function SessionList() {
  const { sessions, activeSessionId, selectSession, deleteSession, loadSessions } =
    useSessionStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  if (sessions.length === 0) {
    return (
      <div className="text-center py-6 px-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-white/20">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-xs text-white/30">チャットがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          title={session.title}
          isActive={session.id === activeSessionId}
          onClick={() => selectSession(session.id)}
          onDelete={() => deleteSession(session.id)}
        />
      ))}
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
    <div className="relative group">
      <button
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-white/15 shadow-lg'
            : 'hover:bg-white/8 hover:translate-x-0.5'
        }`}
        onClick={onClick}
      >
        <div className="flex items-center gap-2.5">
          {/* Active indicator */}
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          )}
          <span className={`text-sm truncate ${
            isActive ? 'font-medium text-white/90' : 'text-white/60'
          }`}>
            {title}
          </span>
        </div>
      </button>

      {/* Delete button */}
      <button
        className="absolute top-1/2 right-2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}
