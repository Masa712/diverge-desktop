import { useEffect, useRef } from 'react'
import { useModelStore } from '@/stores/modelStore'
import { onOllamaStatusChanged } from '@/lib/tauri'

const POLL_INTERVAL_MS = 30_000

/**
 * Ollama の接続状態を管理するフック。
 * - 起動時に1回ステータス確認
 * - ollama_status_changed イベントをリスン
 * - 30秒ごとにポーリング
 */
export function useOllama() {
  const checkStatus = useModelStore((s) => s.checkStatus)
  const setOllamaStatus = useModelStore((s) => s.setOllamaStatus)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // 初回チェック
    checkStatus()

    // イベントリスン
    const unlistenPromise = onOllamaStatusChanged((status) => {
      setOllamaStatus(status)
      if (status.running) {
        useModelStore.getState().loadModels()
      }
    })

    // ポーリング
    timerRef.current = setInterval(() => {
      checkStatus()
    }, POLL_INTERVAL_MS)

    return () => {
      unlistenPromise.then((fn) => fn())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [checkStatus, setOllamaStatus])
}
