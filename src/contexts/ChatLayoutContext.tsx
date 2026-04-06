'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface ChatLayoutContextType {
  isLeftSidebarCollapsed: boolean
  setIsLeftSidebarCollapsed: (collapsed: boolean) => void
  isLeftSidebarMobileOpen: boolean
  setIsLeftSidebarMobileOpen: (open: boolean) => void
}

const ChatLayoutContext = createContext<ChatLayoutContextType | undefined>(undefined)

export function ChatLayoutProvider({ children }: { children: ReactNode }) {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false)
  const [isLeftSidebarMobileOpen, setIsLeftSidebarMobileOpen] = useState(false)

  return (
    <ChatLayoutContext.Provider
      value={{
        isLeftSidebarCollapsed,
        setIsLeftSidebarCollapsed,
        isLeftSidebarMobileOpen,
        setIsLeftSidebarMobileOpen,
      }}
    >
      {children}
    </ChatLayoutContext.Provider>
  )
}

export function useChatLayout() {
  const context = useContext(ChatLayoutContext)
  if (context === undefined) {
    throw new Error('useChatLayout must be used within a ChatLayoutProvider')
  }
  return context
}
