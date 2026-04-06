import { createClient } from '@/lib/supabase/server'
import { Session } from '@/types'

export async function createSession(name: string, description?: string): Promise<Session> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      name,
      description,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserSessions(): Promise<Session[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('last_accessed_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

export async function updateSessionAccess(sessionId: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('sessions')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw error
}

export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw error
}