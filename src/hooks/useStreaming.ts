import { useEffect, useRef } from 'react'
import { useSessionStore } from '@/stores/sessionStore'
import { onStreamToken, onStreamDone, onStreamError } from '@/lib/tauri'
import { log } from '@/lib/utils/logger'

const FLUSH_INTERVAL_MS = 50

/**
 * ストリーミングトークンを受信して sessionStore を更新するフック。
 * - 50ms バッファリングで過剰な再レンダリングを防ぐ
 * - stream_done で isStreaming フラグを解除し tokenCount を確定
 * - stream_error でエラーを記録
 */
export function useStreaming() {
  const appendNodeContent = useSessionStore((s) => s.appendNodeContent)
  const finalizeNode = useSessionStore((s) => s.finalizeNode)
  const replaceNodeId = useSessionStore((s) => s.replaceNodeId)

  // バッファ: nodeId → 蓄積トークン文字列
  const bufferRef = useRef<Map<string, string>>(new Map())
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function flush(nodeId: string) {
    const content = bufferRef.current.get(nodeId)
    if (content) {
      appendNodeContent(nodeId, content)
      bufferRef.current.set(nodeId, '')
    }
  }

  useEffect(() => {
    let active = true  // StrictMode の二重実行でリスナーが重複しないよう管理
    const unlistenAll: Array<() => void> = []

    const tokenP = onStreamToken(({ nodeId, token }) => {
      if (!active) return
      console.log('[useStreaming] stream_token received', { nodeId, tokenLen: token.length })
      log.debug('[useStreaming] stream_token', { nodeId, tokenLen: token.length })

      // ストアにこの nodeId のノードが存在しない場合、
      // placeholder ノード（isStreaming=true の仮ノード）を実際の ID に置き換える
      const store = useSessionStore.getState()
      const nodeExists = store.nodes.some((n) => n.id === nodeId)
      if (!nodeExists) {
        const placeholder = store.nodes.find(
          (n) => n.id.startsWith('placeholder-') && n.isStreaming,
        )
        if (placeholder) {
          console.log('[useStreaming] replacing placeholder', { from: placeholder.id, to: nodeId })
          log.debug('[useStreaming] replacing placeholder', { from: placeholder.id, to: nodeId })
          // replaceNodeId でプレースホルダーを in-place で置き換え（古い ID は削除される）
          replaceNodeId(placeholder.id, { ...placeholder, id: nodeId })
          console.log('[useStreaming] after replace, nodes:', useSessionStore.getState().nodes.map(n => `${n.id.slice(0,8)}(${n.role})`))
        } else {
          console.warn('[useStreaming] no placeholder found! nodes:', store.nodes.map(n => `${n.id.slice(0,8)}(${n.role})`))
        }
      }

      // バッファにトークンを追加
      const prev = bufferRef.current.get(nodeId) ?? ''
      bufferRef.current.set(nodeId, prev + token)

      const existing = timerRef.current.get(nodeId)
      if (existing) clearTimeout(existing)
      timerRef.current.set(
        nodeId,
        setTimeout(() => flush(nodeId), FLUSH_INTERVAL_MS),
      )
    })

    const doneP = onStreamDone(({ nodeId, totalTokens }) => {
      if (!active) return
      console.log('[useStreaming] stream_done', { nodeId, totalTokens })
      log.debug('[useStreaming] stream_done', { nodeId, totalTokens })
      flush(nodeId)
      const timer = timerRef.current.get(nodeId)
      if (timer) clearTimeout(timer)
      timerRef.current.delete(nodeId)
      bufferRef.current.delete(nodeId)
      finalizeNode(nodeId, totalTokens)
    })

    const errorP = onStreamError(({ nodeId, error }) => {
      if (!active) return
      console.error('[useStreaming] stream_error', { nodeId, error })
      log.debug('[useStreaming] stream_error', { nodeId, error })
      flush(nodeId)
      finalizeNode(nodeId, 0)
    })

    Promise.all([tokenP, doneP, errorP]).then(([t, d, e]) => {
      unlistenAll.push(t, d, e)
    })

    return () => {
      active = false
      unlistenAll.forEach((fn) => fn())
      timerRef.current.forEach((t) => clearTimeout(t))
    }
  }, [appendNodeContent, finalizeNode, replaceNodeId])
}
