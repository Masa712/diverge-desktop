import { ChatLayoutProvider } from '@/contexts/ChatLayoutContext'
import { useOllama } from '@/hooks/useOllama'
import { useStreaming } from '@/hooks/useStreaming'
import { useChat } from '@/hooks/useChat'
import { useSessionStore } from '@/stores/sessionStore'
import { useModelStore } from '@/stores/modelStore'
import { buildDisplayNodes } from '@/lib/nodeAdapter'
import { SessionList } from '@/components/sidebar/SessionList'
import { ModelSelector } from '@/components/chat/model-selector'
import { ChatTreeView } from '@/components/tree/chat-tree-view'
import { ChatInput } from '@/components/chat/chat-input'
import { OllamaStatusBanner } from '@/components/OllamaStatusBanner'

function AppInner() {
  // Ollama 接続管理・ストリーミング受信を起動
  useOllama()
  useStreaming()

  const { activeSessionId, activeNodeId, nodes, setActiveNode } = useSessionStore()
  const { models, selectedModel, selectModel } = useModelStore()
  const { send } = useChat()

  // ツリー表示用 ChatNode に変換
  const displayNodes = buildDisplayNodes(nodes)

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-white">
      {/* Ollama 未起動バナー */}
      <OllamaStatusBanner />

      <div className="flex flex-1 min-h-0">
        {/* サイドバー */}
        <aside className="w-52 shrink-0 flex flex-col border-r border-white/10 bg-[#141414]">
          {/* モデル選択 */}
          <div className="px-3 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 mb-1.5">Model</p>
            <ModelSelector
              models={models}
              selected={selectedModel}
              onChange={selectModel}
            />
          </div>

          {/* セッション一覧 */}
          <div className="flex-1 min-h-0">
            <SessionList />
          </div>
        </aside>

        {/* メインエリア */}
        <main className="flex-1 flex flex-col min-w-0">
          {activeSessionId ? (
            <>
              {/* ノードツリー */}
              <div className="flex-1 min-h-0">
                <ChatTreeView
                  nodes={displayNodes}
                  currentNodeId={activeNodeId ?? undefined}
                  onNodeClick={(nodeId) => setActiveNode(nodeId)}
                  onBackgroundClick={() => setActiveNode(null)}
                />
              </div>

              {/* チャット入力 */}
              <div className="shrink-0 border-t border-white/10 p-3">
                <ChatInput
                  onSendMessage={send}
                  availableNodes={displayNodes}
                />
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
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
    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/50">
      <p className="text-lg">Diverge Desktop</p>
      <p className="text-sm">ノードベース分岐型AIチャット</p>
      {models.length > 0 ? (
        <button
          onClick={handleStart}
          className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          新しいセッションを開始
        </button>
      ) : (
        <p className="text-xs">Ollama を起動してモデルを取得してください</p>
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
