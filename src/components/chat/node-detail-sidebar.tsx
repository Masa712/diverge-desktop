import { useState, useCallback, useRef, useEffect } from 'react'
import { Copy, User, Bot, Settings, RefreshCw, Trash2, MessageCircle, Clock, X } from 'lucide-react'
import { ChatNode } from '@/types'
import { useNodeChain } from '@/hooks/useNodeChain'
import { StreamingAnimation } from '@/components/ui/streaming-animation'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { NodeDeleteConfirmationModal } from './NodeDeleteConfirmationModal'

interface Props {
  node: ChatNode | null
  allNodes: ChatNode[]
  isOpen: boolean
  onClose: () => void
  session?: { id: string; name: string } | null
  onRetryNode?: (nodeId: string, prompt: string) => void
  onDeleteNode?: (nodeId: string) => void
}

export function NodeDetailSidebar({ node, allNodes, isOpen, onClose, session, onRetryNode, onDeleteNode }: Props) {
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const previousNodeIdRef = useRef<string | null>(null)

  const { currentDisplayNode, nodeChain, currentNodeIndex, navigate } = useNodeChain(node, allNodes)

  const hasChildren = useCallback((nodeId: string) => {
    return allNodes.some(n => n.parentId === nodeId)
  }, [allNodes])

  const canDeleteCurrentNode = currentDisplayNode && !hasChildren(currentDisplayNode.id)

  useEffect(() => {
    if (currentDisplayNode?.id !== previousNodeIdRef.current) {
      previousNodeIdRef.current = currentDisplayNode?.id || null
      setComment('')
    }
  }, [currentDisplayNode?.id])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatDate = (date: Date) => {
    try {
      const d = new Date(date)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    } catch {
      return String(date)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10'
      case 'streaming': return 'text-blue-400 bg-blue-500/10'
      case 'failed':    return 'text-red-400 bg-red-500/10'
      case 'pending':   return 'text-yellow-400 bg-yellow-500/10'
      default:          return 'text-white/50 bg-white/5'
    }
  }

  if (!isOpen || !currentDisplayNode) return null

  return (
    <div className="flex flex-col h-full relative">
      {/* Header — Session Title */}
      <div className="px-6 pt-7 pb-4 border-b border-white/10 shrink-0 relative">
        <div className="text-center pr-8">
          <h1 className="text-xl font-bold text-white/90 truncate">
            {session?.name || 'Chat Session'}
          </h1>
        </div>
        <button
          onClick={onClose}
          className="absolute top-5 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Chain */}
      {nodeChain.length > 1 && (
        <div className="px-6 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sidebar-scroll">
            {nodeChain.map((chainNode, index) => (
              <div key={chainNode.id} className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate.toIndex(index)}
                  className={`transition-all duration-200 ${
                    index === currentNodeIndex
                      ? 'text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent scale-110'
                      : 'text-sm text-white/40 hover:text-white/70 hover:scale-105'
                  }`}
                  title={chainNode.prompt.substring(0, 50) + '...'}
                >
                  {index + 1}
                </button>
                {index < nodeChain.length - 1 && (
                  <div className="w-4 h-0.5 bg-white/15 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 sidebar-scroll">
        <div className="space-y-6">

          {/* ── User Prompt ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white/90 text-sm">User</h3>
              <button
                onClick={() => copyToClipboard(currentDisplayNode.prompt)}
                className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                title="Copy prompt"
              >
                <Copy className="w-3.5 h-3.5 text-white/30" />
              </button>
            </div>
            <div className="bg-white/8 backdrop-blur rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                {currentDisplayNode.prompt}
              </p>
            </div>
          </div>

          {/* ── AI Response ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white/90 text-sm">AI Response</h3>

              {/* Model tag */}
              <span className="px-2 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-400 rounded-full">
                {currentDisplayNode.model}
              </span>

              {currentDisplayNode.response && (
                <button
                  onClick={() => copyToClipboard(currentDisplayNode.response!)}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy response"
                >
                  <Copy className="w-3.5 h-3.5 text-white/30" />
                </button>
              )}
            </div>
            <div className="bg-white/8 backdrop-blur rounded-lg p-4 border border-white/10">
              {currentDisplayNode.status === 'streaming' ? (
                currentDisplayNode.response ? (
                  <div>
                    <MarkdownRenderer content={currentDisplayNode.response} className="text-sm leading-relaxed" />
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <StreamingAnimation />
                    </div>
                  </div>
                ) : (
                  <div className="py-4 flex items-start">
                    <StreamingAnimation />
                  </div>
                )
              ) : currentDisplayNode.status === 'failed' ? (
                <div className="py-4 flex flex-col items-center space-y-3">
                  <p className="text-sm text-red-400">Generation failed</p>
                  {currentDisplayNode.errorMessage && (
                    <p className="text-xs text-red-500/70 text-center">{currentDisplayNode.errorMessage}</p>
                  )}
                  <button
                    onClick={() => onRetryNode?.(currentDisplayNode.id, currentDisplayNode.prompt)}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : currentDisplayNode.response ? (
                <MarkdownRenderer content={currentDisplayNode.response} className="text-sm leading-relaxed" />
              ) : (
                <div className="py-4 text-center text-white/30 text-sm italic">
                  Waiting for response...
                </div>
              )}
            </div>
          </div>

          {/* ── Comments ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="font-semibold text-white/90 text-sm">Comments</h3>
            </div>

            {/* Comment input */}
            <div className="bg-white/8 backdrop-blur rounded-lg p-4 border border-white/10">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="このレスポンスについてメモを残す..."
                className="w-full resize-none bg-transparent border-none text-sm text-white/80 placeholder:text-white/25 focus:outline-none"
                rows={3}
              />
              {comment.trim() && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <button
                    className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full hover:from-blue-500/30 hover:to-purple-500/30 transition-colors"
                  >
                    Save Comment
                  </button>
                </div>
              )}
            </div>

            <div className="text-center py-2">
              <span className="text-[10px] text-white/20">コメント機能は今後のアップデートで拡張されます</span>
            </div>
          </div>

          {/* ── System Prompt ── */}
          {currentDisplayNode.systemPrompt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-white/90 text-sm">System Prompt</h3>
                <button
                  onClick={() => copyToClipboard(currentDisplayNode.systemPrompt!)}
                  className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>
              <div className="bg-white/8 backdrop-blur rounded-lg p-4 border border-white/10">
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                  {currentDisplayNode.systemPrompt}
                </p>
              </div>
            </div>
          )}

          {/* ── Details ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-white/40" />
              </div>
              <h3 className="font-semibold text-white/90 text-sm">Details</h3>
            </div>
            <div className="bg-white/8 backdrop-blur rounded-lg p-4 border border-white/10 space-y-4">
              {/* Status */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Status</div>
                <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentDisplayNode.status)}`}>
                  {currentDisplayNode.status.charAt(0).toUpperCase() + currentDisplayNode.status.slice(1)}
                </div>
              </div>

              {/* Created */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Created</div>
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <Clock className="w-3 h-3 text-white/30" />
                  {formatDate(currentDisplayNode.createdAt)}
                </div>
              </div>

              {/* Tokens */}
              {currentDisplayNode.responseTokens > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Tokens</div>
                  <div className="text-sm text-white/70">{currentDisplayNode.responseTokens}</div>
                </div>
              )}

              {/* Node ID */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Node ID</div>
                <div className="text-sm text-white/50 font-mono">{currentDisplayNode.id.slice(-8)}</div>
              </div>

              {/* Delete */}
              {canDeleteCurrentNode && (
                <div className="pt-3 border-t border-white/10">
                  <button
                    onClick={() => setNodeToDelete(currentDisplayNode.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Node</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <NodeDeleteConfirmationModal
        nodeId={nodeToDelete}
        onConfirm={(nodeId) => {
          onDeleteNode?.(nodeId)
          setNodeToDelete(null)
        }}
        onCancel={() => setNodeToDelete(null)}
      />
    </div>
  )
}
