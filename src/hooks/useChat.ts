import { useCallback } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { useModelStore } from '@/stores/modelStore'
import { createUserNode, sendMessage } from '@/lib/tauri'
import { log } from '@/lib/utils/logger'
import type { Node } from '@/types/session'

/**
 * チャット操作フック。
 * send → branch → retry の3つのアクションを提供する。
 */
export function useChat() {
  const { activeSessionId, activeNodeId, nodes, upsertNode, setActiveNode } = useSessionStore()
  const selectedModel = useModelStore((s) => s.selectedModel)

  /**
   * 現在のアクティブノードの子として新しいユーザーメッセージを送信する。
   */
  const send = useCallback(
    async (content: string) => {
      if (!activeSessionId || !selectedModel) return

      // アクティブノードを親に設定（最初のメッセージは null）
      const parentId = activeNodeId

      // 1. ユーザーノードを作成
      const userNode = await createUserNode(activeSessionId, parentId, content)
      upsertNode(userNode)
      setActiveNode(userNode.id)

      // 2. アシスタントノードのプレースホルダーを楽観的に追加
      const placeholderAssistant: Node = {
        id: `placeholder-${userNode.id}`,
        sessionId: activeSessionId,
        parentId: userNode.id,
        role: 'assistant',
        content: '',
        modelId: selectedModel,
        isStreaming: true,
        createdAt: Date.now(),
      }
      upsertNode(placeholderAssistant)

      // 3. send_message を呼び出し（ストリーミング開始）
      log.debug('[useChat] calling sendMessage', { sessionId: activeSessionId, userNodeId: userNode.id, model: selectedModel })
      const assistantNodeId = await sendMessage(activeSessionId, userNode.id, selectedModel)
      log.debug('[useChat] sendMessage done', { assistantNodeId })

      // 4. プレースホルダーが残っていれば実際の ID に差し替え（useStreaming で既に置き換え済みの場合はスキップ）
      const store = useSessionStore.getState()
      if (!store.nodes.some((n) => n.id === assistantNodeId)) {
        upsertNode({ ...placeholderAssistant, id: assistantNodeId })
      }
    },
    [activeSessionId, activeNodeId, selectedModel, upsertNode, setActiveNode],
  )

  /**
   * 指定ノードから分岐（同じ親に新しいユーザーノードを送信）。
   */
  const branchFrom = useCallback(
    async (nodeId: string, content: string) => {
      if (!activeSessionId || !selectedModel) return

      // 指定ノードと同じ親 ID を使う
      const sourceNode = nodes.find((n) => n.id === nodeId)
      if (!sourceNode) return

      const parentId = sourceNode.parentId
      setActiveNode(parentId)

      const userNode = await createUserNode(activeSessionId, parentId, content)
      upsertNode(userNode)
      setActiveNode(userNode.id)

      const placeholderAssistant: Node = {
        id: `placeholder-${userNode.id}`,
        sessionId: activeSessionId,
        parentId: userNode.id,
        role: 'assistant',
        content: '',
        modelId: selectedModel,
        isStreaming: true,
        createdAt: Date.now(),
      }
      upsertNode(placeholderAssistant)

      const assistantNodeId = await sendMessage(activeSessionId, userNode.id, selectedModel)
      upsertNode({ ...placeholderAssistant, id: assistantNodeId })
    },
    [activeSessionId, selectedModel, nodes, upsertNode, setActiveNode],
  )

  /**
   * 指定ノードと同じ内容で再試行（同じ親に同じプロンプトを送信）。
   */
  const retry = useCallback(
    async (nodeId: string) => {
      if (!activeSessionId || !selectedModel) return

      const userNode = nodes.find((n) => n.id === nodeId && n.role === 'user')
      if (!userNode) return

      await branchFrom(nodeId, userNode.content)
    },
    [activeSessionId, selectedModel, nodes, branchFrom],
  )

  return { send, branchFrom, retry }
}
