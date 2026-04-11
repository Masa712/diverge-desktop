import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useError } from '@/components/providers/error-provider'
import { useModelStore } from '@/stores/modelStore'
import { ChatNode } from '@/types'

interface Props {
  onSendMessage: (message: string) => Promise<void>
  disabled?: boolean
  availableNodes?: ChatNode[]
  onInputMount?: (insertFunction: (text: string) => void) => void
  onFocusChange?: (focused: boolean) => void
}

export function ChatInput({ onSendMessage, disabled = false, availableNodes: _availableNodes = [], onInputMount, onFocusChange }: Props) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { showError } = useError()
  const { models, selectedModel, selectModel } = useModelStore()

  const handleSubmit = async () => {
    if (!message.trim() || sending || disabled) return

    const messageToSend = message.trim()
    setMessage('')
    resetTextareaHeight()
    setSending(true)

    try {
      await onSendMessage(messageToSend)
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to send message. Please try again.'
      showError(errorMessage)
      setMessage(messageToSend)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  const resetTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
    }
  }

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = textarea.value
    const newValue = currentValue.slice(0, start) + text + currentValue.slice(end)
    setMessage(newValue)
    textarea.value = newValue
    setTimeout(() => {
      textarea.focus()
      const pos = start + text.length
      textarea.setSelectionRange(pos, pos)
      adjustTextareaHeight()
    }, 0)
  }, [])

  useEffect(() => {
    onInputMount?.(insertAtCursor)
  }, [onInputMount, insertAtCursor])

  const canSend = message.trim().length > 0 && !sending && !disabled

  return (
    <div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          adjustTextareaHeight()
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => {
          setTimeout(() => onFocusChange?.(false), 200)
        }}
        placeholder="メッセージを入力... (Enter で送信, Shift+Enter で改行)"
        disabled={sending || disabled}
        className="w-full resize-none bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/30 focus:bg-white/15 focus:border-white/25 focus:outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ minHeight: '44px', maxHeight: '120px' }}
      />

      {/* Bottom controls */}
      <div className="flex items-center justify-between mt-2">
        {/* Left: action buttons */}
        <div className="flex items-center gap-1.5">
          {/* + (file upload placeholder) */}
          <button
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 text-white/40 hover:text-white/70 flex items-center justify-center transition-colors"
            title="ファイルを添付 (Coming soon)"
            disabled
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Web search toggle */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              webSearchEnabled
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/70'
            }`}
            title={webSearchEnabled ? 'ウェブ検索: ON' : 'ウェブ検索: OFF'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Right: model selector + send */}
        <div className="flex items-center gap-2">
          {/* Compact model selector */}
          <select
            value={selectedModel}
            onChange={(e) => selectModel(e.target.value)}
            className="bg-white/8 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 focus:bg-white/15 focus:border-white/20 focus:outline-none transition-colors max-w-[160px] truncate"
          >
            {models.map(m => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              canSend
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:scale-105'
                : 'bg-white/10 text-white/20 cursor-not-allowed'
            }`}
            title="送信"
          >
            {sending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
