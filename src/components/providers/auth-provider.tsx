// Stub for Phase 1 — desktop app does not require authentication
import { createContext, useContext, ReactNode } from 'react'

interface AuthUser {
  email?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, isLoading: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
