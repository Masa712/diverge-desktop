import { create } from 'zustand'
import type { AppSettings } from '@/types/session'
import { DEFAULT_SETTINGS } from '@/types/session'
import * as tauri from '@/lib/tauri'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean

  loadSettings: () => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const settings = await tauri.getSettings()
      set({ settings, isLoaded: true })
    } catch {
      // バックエンド未実装時はデフォルト値を使用
      set({ isLoaded: true })
    }
  },

  updateSettings: async (patch: Partial<AppSettings>) => {
    const next = { ...get().settings, ...patch }
    await tauri.updateSettings(patch)
    set({ settings: next })
  },
}))
