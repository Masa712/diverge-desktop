import { createContext, useContext, useState, ReactNode } from 'react'

interface ErrorContextValue {
  error: string | null
  setError: (message: string) => void
  showError: (message: string) => void  // alias for setError
  clearError: () => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<string | null>(null)

  function setError(message: string) {
    setErrorState(message)
  }

  function clearError() {
    setErrorState(null)
  }

  return (
    <ErrorContext.Provider value={{ error, setError, showError: setError, clearError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useError(): ErrorContextValue {
  const ctx = useContext(ErrorContext)
  if (!ctx) {
    throw new Error('useError must be used within ErrorProvider')
  }
  return ctx
}
