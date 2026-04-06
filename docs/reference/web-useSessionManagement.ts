import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { useError } from '@/components/providers/error-provider'
import { Session } from '@/types'

interface DashboardData {
  totalSessions: number
  totalCost: number
  totalTokens: number
  monthlyUsage: number
}

export function useSessionManagement(currentSessionId?: string, currentSession?: Session | null) {
  const { showError } = useError()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSessions: 0,
    totalCost: 0,
    totalTokens: 0,
    monthlyUsage: 0
  })

  const fetchSessionsAndDashboard = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.ok) {
        const result = await response.json()
        const sessionsData = result.data?.sessions || []
        setSessions(sessionsData)
        
        // Calculate dashboard data from the same response
        const totalCost = sessionsData.reduce((sum: number, session: Session) => 
          sum + (session.totalCostUsd || 0), 0)
        const totalTokens = sessionsData.reduce((sum: number, session: Session) => 
          sum + (session.totalTokens || 0), 0)
        
        setDashboardData({
          totalSessions: sessionsData.length,
          totalCost,
          totalTokens,
          monthlyUsage: totalCost
        })
      } else {
        showError('Failed to load sessions')
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      showError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async (onNewSession: () => void, onSessionSelect: (id: string) => void) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Chat',
          description: 'New conversation'
        }),
      })

      if (response.ok) {
        const { data } = await response.json()
        const session = data.session
        
        // Add the new session to the list immediately for instant feedback
        setSessions(prevSessions => {
          const newSessions = [session, ...prevSessions]
          return newSessions
        })
        
        // Also refetch sessions after a short delay to ensure cache is cleared
        setTimeout(() => fetchSessionsAndDashboard(), 200)
        
        onNewSession()
        onSessionSelect(session.id)
      } else {
        showError('Failed to create session')
      }
    } catch (error) {
      console.error('Error creating session:', error)
      showError('Failed to create session')
    }
  }

  const handleDeleteSession = async (sessionId: string, onNewSession: () => void) => {
    // Immediately close the confirmation dialog
    setSessionToDelete(null)
    
    try {
      // Immediately remove from UI for better UX
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId))
      
      // If the deleted session is currently selected, switch to new session
      if (currentSessionId === sessionId) {
        onNewSession()
      }
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh immediately to ensure consistency with backend
        fetchSessionsAndDashboard()
        // Success - no notification needed
      } else if (response.status === 404) {
        // Session was already deleted, no need to restore or notify
      } else {
        // Restore session on error
        const errorData = await response.json().catch(() => ({}))
        
        // Re-fetch sessions to restore the list
        await fetchSessionsAndDashboard()
        
        // Extract error message safely
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error?.message || 'Failed to delete session'
        showError(errorMessage)
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      // Re-fetch sessions to restore the list on error
      await fetchSessionsAndDashboard()
      showError('Failed to delete session')
    }
  }

  // Initial load
  useEffect(() => {
    fetchSessionsAndDashboard()

    // Listen for session sync events from other components
    const handleSessionSyncNeeded = () => {
      fetchSessionsAndDashboard()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('session-sync-needed', handleSessionSyncNeeded)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('session-sync-needed', handleSessionSyncNeeded)
      }
    }
  }, [])

  return {
    sessions,
    loading,
    sessionToDelete,
    setSessionToDelete,
    dashboardData,
    handleCreateSession,
    handleDeleteSession,
    fetchSessionsAndDashboard
  }
}