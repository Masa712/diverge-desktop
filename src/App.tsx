import { useState, useCallback, useMemo } from 'react'
import { ChatLayoutProvider, useChatLayout } from '@/contexts/ChatLayoutContext'
import { useOllama } from '@/hooks/useOllama'
import { useStreaming } from '@/hooks/useStreaming'
import { useChat } from '@/hooks/useChat'
import { useSidebarResize } from '@/hooks/useSidebarResize'
import { useSessionStore } from '@/stores/sessionStore'
import { useModelStore } from '@/stores/modelStore'
import { buildDisplayNodes } from '@/lib/nodeAdapter'
import { SessionList } from '@/components/sidebar/SessionList'
import { ModelSelector } from '@/components/chat/model-selector'
import { ChatTreeView } from '@/components/tree/chat-tree-view'
import { ChatInput } from '@/components/chat/chat-input'
import { OllamaStatusBanner } from '@/components/OllamaStatusBanner'
import { NodeDetailSidebar } from '@/components/chat/node-detail-sidebar'
import { ChatNode } from '@/types'

// Sidebar geometry (px)
const L_EXPANDED = 260
const L_COLLAPSED = 52
const L_MARGIN   = 20   // distance from window edge
const L_GAP      = 12   // gap between sidebar and bottom bar
const R_MARGIN   = 20
const R_GAP      = 12
const EDGE_PAD   = 20   // top/bottom window padding
const R_WIDTH    = 400

function AppInner() {
  useOllama()
  useStreaming()

  const { isLeftSidebarCollapsed, setIsLeftSidebarCollapsed } = useChatLayout()
  const { activeSessionId, activeNodeId, nodes, sessions, setActiveNode, isGenerating } = useSessionStore()
  const { models, selectedModel, selectModel } = useModelStore()
  const { send, stop, retry } = useChat()

  const [selectedNodeForDetail, setSelectedNodeForDetail] = useState<ChatNode | null>(null)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false)
  const [resizeDoneToken, setResizeDoneToken] = useState(0)

  const {
    width: rightSidebarWidth,
    isResizing: isRightSidebarResizing,
    sidebarRef: rightPanelRef,
    handleMouseDown: handleRightResizeMouseDown,
  } = useSidebarResize({
    initialWidth: R_WIDTH,
    minWidth: 320,
    maxWidth: 700,
    onResizeEnd: () => setResizeDoneToken(t => t + 1),
  })

  const displayNodes = useMemo(() => buildDisplayNodes(nodes), [nodes])

  const handleNodeClick = useCallback((nodeId: string) => {
    setActiveNode(nodeId)
    // Read latest nodes from store to avoid depending on displayNodes reference
    const currentNodes = buildDisplayNodes(useSessionStore.getState().nodes)
    const node = currentNodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNodeForDetail(node)
      setIsRightSidebarOpen(true)
    }
  }, [setActiveNode])

  const handleCloseRightSidebar = useCallback(() => {
    setIsRightSidebarOpen(false)
    setSelectedNodeForDetail(null)
  }, [])

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const lWidth = isLeftSidebarCollapsed ? L_COLLAPSED : L_EXPANDED

  // Bottom bar positioning: sits between left and right sidebars
  const bottomBarLeft  = L_MARGIN + lWidth + L_GAP
  const bottomBarRight = isRightSidebarOpen
    ? R_MARGIN + rightSidebarWidth + R_GAP
    : R_MARGIN + R_GAP

  return (
    <div
      className="relative h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 20% 20%, #1e1040 0%, #0a0a18 45%, #0c1828 100%)',
      }}
    >
      {/* Colour blobs for depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-500/8 rounded-full blur-3xl" />
      </div>

      {/* ── Tree view — fills the ENTIRE screen so it shows through glass panels ── */}
      {activeSessionId ? (
        <div className="absolute inset-0">
          <ChatTreeView
            nodes={displayNodes}
            currentNodeId={activeNodeId ?? undefined}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setActiveNode(null)}
            isLeftSidebarCollapsed={isLeftSidebarCollapsed}
            isRightSidebarOpen={isRightSidebarOpen}
            rightSidebarWidth={rightSidebarWidth}
            resizeDoneToken={resizeDoneToken}
          />
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Ollama banner — top center */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <OllamaStatusBanner />
      </div>

      {/* ── Left Sidebar (floating glass overlay) ── */}
      <aside
        className="glass-panel rounded-[2rem] fixed z-50 flex flex-col transition-all duration-300"
        style={{ left: L_MARGIN, top: EDGE_PAD, bottom: EDGE_PAD, width: lWidth }}
      >
        {/* Header — Logo */}
        <div className="px-5 pt-7 pb-5 border-b border-white/10 relative">
          {!isLeftSidebarCollapsed && (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white/90 tracking-tight">Diverge</h1>
            </div>
          )}
          <div className={isLeftSidebarCollapsed ? 'flex justify-center' : 'absolute top-4 right-4'}>
            <button
              onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
              className="p-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 transition-all duration-200"
              title={isLeftSidebarCollapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {!isLeftSidebarCollapsed && (
          <>
            {/* Session list */}
            <div className="flex-1 min-h-0 sidebar-scroll overflow-y-auto px-3 py-3">
              <div className="flex items-center justify-between mb-3 px-2">
                <h2 className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Recent Chats</h2>
                <span className="text-[10px] text-white/25">{sessions.length}</span>
              </div>
              <SessionList />
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-3 space-y-2">
              {/* New Chat button */}
              <button
                onClick={async () => {
                  if (!selectedModel) return
                  const session = await useSessionStore.getState().createSession(selectedModel, '新しいセッション')
                  useSessionStore.getState().selectSession(session.id)
                }}
                disabled={!selectedModel}
                className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/15 text-white/80 text-sm font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Chat
              </button>

              {/* Model selector */}
              <ModelSelector models={models} selected={selectedModel} onChange={selectModel} />
            </div>
          </>
        )}

        {/* Collapsed: session icons */}
        {isLeftSidebarCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto py-2 px-1.5">
              {sessions.slice(0, 8).map(s => (
                <button
                  key={s.id}
                  onClick={() => useSessionStore.getState().selectSession(s.id)}
                  className={`w-full p-2 mb-1 rounded-lg transition-all duration-200 ${
                    s.id === activeSessionId ? 'bg-white/20 shadow-lg' : 'hover:bg-white/10'
                  }`}
                  title={s.title}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mx-auto ${s.id === activeSessionId ? 'text-white' : 'text-white/40'}`}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              ))}
            </div>
            {/* Collapsed new chat */}
            <div className="p-2 border-t border-white/10">
              <button
                onClick={async () => {
                  if (!selectedModel) return
                  const session = await useSessionStore.getState().createSession(selectedModel, '新しいセッション')
                  useSessionStore.getState().selectSession(session.id)
                }}
                disabled={!selectedModel}
                className="w-full p-2 rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 transition-all disabled:opacity-30"
                title="New Chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── Right Sidebar (floating glass overlay) ── */}
      {isRightSidebarOpen && selectedNodeForDetail && (
        <div
          ref={rightPanelRef}
          className="glass-panel rounded-[1.5rem] fixed z-50 flex flex-col overflow-hidden"
          style={{
            right: R_MARGIN,
            top: EDGE_PAD,
            bottom: EDGE_PAD,
            width: rightSidebarWidth,
            transition: isRightSidebarResizing ? 'none' : 'width 0.3s ease',
          }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-4 bottom-4 w-1.5 cursor-ew-resize rounded-full hover:bg-white/20 z-10 transition-colors"
            onMouseDown={handleRightResizeMouseDown}
          />
          <NodeDetailSidebar
            node={selectedNodeForDetail}
            allNodes={displayNodes}
            isOpen={isRightSidebarOpen}
            onClose={handleCloseRightSidebar}
            session={activeSession ? { id: activeSession.id, name: activeSession.title } : null}
            onRetryNode={(nodeId) => retry(nodeId)}
            onDeleteNode={(_nodeId) => { /* TODO */ }}
          />
        </div>
      )}

      {/* ── Bottom bar: generating banner + chat input (floating glass) ── */}
      {activeSessionId && (
        <div
          className="fixed z-40"
          style={{
            left: bottomBarLeft,
            right: bottomBarRight,
            bottom: EDGE_PAD + 4,
            pointerEvents: 'none',
            transition: isRightSidebarResizing ? 'none' : 'left 0.3s ease, right 0.3s ease',
          }}
        >
          <div className="max-w-4xl mx-auto px-[30px] flex flex-col gap-2" style={{ pointerEvents: 'auto' }}>
            {isGenerating && (
              <div className="glass-panel rounded-xl px-4 py-1.5 flex items-center justify-center gap-3">
                <span className="text-xs text-white/50">モデルが応答を生成中...</span>
                <button
                  onClick={stop}
                  className="px-3 py-0.5 rounded text-xs bg-red-600/70 hover:bg-red-600 text-white transition-colors"
                >
                  ■ 停止
                </button>
              </div>
            )}
            <div className="glass-panel rounded-2xl px-4 py-3">
              <ChatInput
                onSendMessage={send}
                availableNodes={displayNodes}
                disabled={isGenerating}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const { models, selectedModel } = useModelStore()
  const createSession = useSessionStore((s) => s.createSession)
  const selectSession = useSessionStore((s) => s.selectSession)

  async function handleStart() {
    if (!selectedModel) return
    const session = await createSession(selectedModel, '新しいセッション')
    selectSession(session.id)
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <p className="text-2xl font-bold text-white/70 tracking-tight">Diverge Desktop</p>
      <p className="text-sm text-white/35">ノードベース分岐型AIチャット</p>
      {models.length > 0 ? (
        <button
          onClick={handleStart}
          className="mt-4 px-5 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          新しいセッションを開始
        </button>
      ) : (
        <p className="text-xs text-white/30">Ollama を起動してモデルを取得してください</p>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ChatLayoutProvider>
      <AppInner />
    </ChatLayoutProvider>
  )
}
