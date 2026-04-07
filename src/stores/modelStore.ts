import { create } from 'zustand'
import type { OllamaModel, RunningModel, OllamaStatus } from '@/types/ollama'
import * as tauri from '@/lib/tauri'

interface ModelState {
  models: OllamaModel[]
  runningModels: RunningModel[]
  selectedModel: string
  ollamaStatus: OllamaStatus
  isLoading: boolean

  // Actions
  loadModels: () => Promise<void>
  checkStatus: () => Promise<void>
  selectModel: (name: string) => void
  pullModel: (name: string) => Promise<void>
  deleteModel: (name: string) => Promise<void>
  setOllamaStatus: (status: OllamaStatus) => void
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  runningModels: [],
  selectedModel: '',
  ollamaStatus: { running: false },
  isLoading: false,

  loadModels: async () => {
    set({ isLoading: true })
    try {
      const [models, runningModels] = await Promise.all([
        tauri.listLocalModels(),
        tauri.listRunningModels(),
      ])
      set((s) => ({
        models,
        runningModels,
        // 初回ロード時にデフォルト選択
        selectedModel: s.selectedModel || models[0]?.name || '',
      }))
    } catch {
      // Ollama が未起動の場合は空リストのまま
    } finally {
      set({ isLoading: false })
    }
  },

  checkStatus: async () => {
    try {
      const status = await tauri.checkOllamaStatus()
      set({ ollamaStatus: status })
      if (status.running) {
        await get().loadModels()
      }
    } catch {
      set({ ollamaStatus: { running: false } })
    }
  },

  selectModel: (name: string) => {
    set({ selectedModel: name })
  },

  pullModel: async (name: string) => {
    await tauri.pullModel(name)
    await get().loadModels()
  },

  deleteModel: async (name: string) => {
    await tauri.deleteModel(name)
    set((s) => {
      const models = s.models.filter((m) => m.name !== name)
      const selectedModel = s.selectedModel === name ? (models[0]?.name ?? '') : s.selectedModel
      return { models, selectedModel }
    })
  },

  setOllamaStatus: (status: OllamaStatus) => {
    set({ ollamaStatus: status })
  },
}))
