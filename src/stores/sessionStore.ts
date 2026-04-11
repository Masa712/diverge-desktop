import { create } from 'zustand'
import type { Session, Node } from '@/types/session'
import * as tauri from '@/lib/tauri'

interface SessionState {
  sessions: Session[]
  activeSessionId: string | null
  activeNodeId: string | null
  nodes: Node[]
  isLoadingSessions: boolean
  isLoadingNodes: boolean
  isGenerating: boolean  // モデルが生成中（ロード待ちを含む）

  // Actions
  loadSessions: () => Promise<void>
  createSession: (modelId: string, title?: string) => Promise<Session>
  deleteSession: (id: string) => Promise<void>
  selectSession: (id: string) => Promise<void>
  updateSessionTitle: (id: string, title: string) => Promise<void>
  setActiveNode: (nodeId: string | null) => void
  loadNodes: (sessionId: string) => Promise<void>
  upsertNode: (node: Node) => void
  replaceNodeId: (oldId: string, node: Node) => void
  appendNodeContent: (nodeId: string, token: string) => void
  finalizeNode: (nodeId: string, totalTokens: number) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,
  activeNodeId: null,
  nodes: [],
  isLoadingSessions: false,
  isLoadingNodes: false,
  isGenerating: false,

  loadSessions: async () => {
    set({ isLoadingSessions: true })
    try {
      const sessions = await tauri.getSessions()
      set({ sessions })
    } finally {
      set({ isLoadingSessions: false })
    }
  },

  createSession: async (modelId: string, title?: string) => {
    const session = await tauri.createSession(modelId, title)
    set((s) => ({ sessions: [session, ...s.sessions] }))
    return session
  },

  deleteSession: async (id: string) => {
    await tauri.deleteSession(id)
    set((s) => {
      const sessions = s.sessions.filter((sess) => sess.id !== id)
      const activeSessionId = s.activeSessionId === id ? null : s.activeSessionId
      const nodes = activeSessionId === null ? [] : s.nodes
      return { sessions, activeSessionId, nodes }
    })
  },

  selectSession: async (id: string) => {
    set({ activeSessionId: id, activeNodeId: null, nodes: [], isLoadingNodes: true })
    try {
      const nodes = await tauri.getNodes(id)
      // アクティブノードはアシスタントノードのうち最新のものを選ぶ
      const lastAssistant = [...nodes]
        .reverse()
        .find((n) => n.role === 'assistant' && !n.isStreaming)
      set({ nodes, activeNodeId: lastAssistant?.id ?? null })
    } finally {
      set({ isLoadingNodes: false })
    }
  },

  updateSessionTitle: async (id: string, title: string) => {
    await tauri.updateSession(id, { title })
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, title } : sess)),
    }))
  },

  setActiveNode: (nodeId: string | null) => {
    set({ activeNodeId: nodeId })
  },

  loadNodes: async (sessionId: string) => {
    set({ isLoadingNodes: true })
    try {
      const nodes = await tauri.getNodes(sessionId)
      set({ nodes })
    } finally {
      set({ isLoadingNodes: false })
    }
  },

  upsertNode: (node: Node) => {
    set((s) => {
      const exists = s.nodes.some((n) => n.id === node.id)
      if (exists) {
        return { nodes: s.nodes.map((n) => (n.id === node.id ? node : n)) }
      }
      return { nodes: [...s.nodes, node] }
    })
  },

  replaceNodeId: (oldId: string, node: Node) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === oldId ? node : n)),
    }))
  },

  appendNodeContent: (nodeId: string, token: string) => {
    console.log('[sessionStore] appendNodeContent', { nodeId: nodeId.slice(0,8), tokenLen: token.length })
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, content: n.content + token, isStreaming: true } : n,
      ),
    }))
  },

  finalizeNode: (nodeId: string, totalTokens: number) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, isStreaming: false, tokenCount: totalTokens } : n,
      ),
      activeNodeId: nodeId,
    }))
  },
}))
