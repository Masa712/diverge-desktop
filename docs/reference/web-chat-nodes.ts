import { createClient } from '@/lib/supabase/server'
import { ChatNode, ModelId, NodeStatus } from '@/types'

export async function createChatNode(data: {
  sessionId: string
  parentId?: string
  model: ModelId
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}): Promise<ChatNode> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Calculate depth
  let depth = 0
  if (data.parentId) {
    const { data: parent } = await supabase
      .from('chat_nodes')
      .select('depth')
      .eq('id', data.parentId)
      .single()
    
    if (parent) depth = parent.depth + 1
  }

  const { data: node, error } = await supabase
    .from('chat_nodes')
    .insert({
      session_id: data.sessionId,
      parent_id: data.parentId,
      model: data.model,
      prompt: data.prompt,
      system_prompt: data.systemPrompt,
      temperature: data.temperature,
      max_tokens: data.maxTokens,
      depth,
      status: 'pending' as NodeStatus,
    })
    .select()
    .single()

  if (error) throw error
  
  // Convert snake_case to camelCase for consistency
  return {
    id: node.id,
    parentId: node.parent_id,
    sessionId: node.session_id,
    model: node.model,
    systemPrompt: node.system_prompt,
    prompt: node.prompt,
    response: node.response,
    status: node.status,
    errorMessage: node.error_message,
    depth: node.depth,
    promptTokens: node.prompt_tokens || 0,
    responseTokens: node.response_tokens || 0,
    costUsd: node.cost_usd || 0,
    temperature: node.temperature,
    maxTokens: node.max_tokens,
    topP: node.top_p,
    metadata: node.metadata || {},
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }
}

export async function getSessionChatNodes(sessionId: string): Promise<ChatNode[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('chat_nodes')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  
  // Convert snake_case to camelCase for TypeScript consistency
  return (data || []).map(node => ({
    id: node.id,
    parentId: node.parent_id,
    sessionId: node.session_id,
    model: node.model,
    systemPrompt: node.system_prompt,
    prompt: node.prompt,
    response: node.response,
    status: node.status,
    errorMessage: node.error_message,
    depth: node.depth,
    promptTokens: node.prompt_tokens || 0,
    responseTokens: node.response_tokens || 0,
    costUsd: node.cost_usd || 0,
    temperature: node.temperature,
    maxTokens: node.max_tokens,
    topP: node.top_p,
    metadata: node.metadata || {},
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }))
}

export async function updateChatNode(
  nodeId: string,
  updates: Partial<{
    response: string
    status: NodeStatus
    errorMessage: string
    promptTokens: number
    responseTokens: number
    costUsd: number
  }>
): Promise<void> {
  const supabase = await createClient()

  // Convert camelCase to snake_case for database columns
  const dbUpdates: any = {}
  if (updates.response !== undefined) dbUpdates.response = updates.response
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage
  if (updates.promptTokens !== undefined) dbUpdates.prompt_tokens = updates.promptTokens
  if (updates.responseTokens !== undefined) dbUpdates.response_tokens = updates.responseTokens
  if (updates.costUsd !== undefined) dbUpdates.cost_usd = updates.costUsd
  
  const { error } = await supabase
    .from('chat_nodes')
    .update({
      ...dbUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', nodeId)

  if (error) throw error
}

export async function getChatNodeById(nodeId: string): Promise<ChatNode | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('chat_nodes')
    .select('*')
    .eq('id', nodeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  
  if (!data) return null
  
  // Convert snake_case to camelCase for consistency
  return {
    id: data.id,
    parentId: data.parent_id,
    sessionId: data.session_id,
    model: data.model,
    systemPrompt: data.system_prompt,
    prompt: data.prompt,
    response: data.response,
    status: data.status,
    errorMessage: data.error_message,
    depth: data.depth,
    promptTokens: data.prompt_tokens || 0,
    responseTokens: data.response_tokens || 0,
    costUsd: data.cost_usd || 0,
    temperature: data.temperature,
    maxTokens: data.max_tokens,
    topP: data.top_p,
    metadata: data.metadata || {},
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export async function getChatNodeChildren(parentId: string): Promise<ChatNode[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('chat_nodes')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  
  // Convert snake_case to camelCase for TypeScript consistency
  return (data || []).map(node => ({
    id: node.id,
    parentId: node.parent_id,
    sessionId: node.session_id,
    model: node.model,
    systemPrompt: node.system_prompt,
    prompt: node.prompt,
    response: node.response,
    status: node.status,
    errorMessage: node.error_message,
    depth: node.depth,
    promptTokens: node.prompt_tokens || 0,
    responseTokens: node.response_tokens || 0,
    costUsd: node.cost_usd || 0,
    temperature: node.temperature,
    maxTokens: node.max_tokens,
    topP: node.top_p,
    metadata: node.metadata || {},
    createdAt: new Date(node.created_at),
    updatedAt: new Date(node.updated_at),
  }))
}

export async function buildContextForNode(nodeId: string): Promise<Array<{ role: string; content: string }>> {
  const supabase = await createClient()
  
  // Use a recursive CTE query to get all ancestors efficiently
  const { data, error } = await supabase.rpc('get_node_ancestors', { node_id: nodeId })
  
  if (error) {
    console.warn('CTE query failed, falling back to iterative approach:', error)
    return buildContextForNodeFallback(nodeId)
  }

  if (!data || data.length === 0) return []
  
  // Convert and sort by depth to ensure proper order
  const nodes: ChatNode[] = data
    .map((node: any) => ({
      id: node.id,
      parentId: node.parent_id,
      sessionId: node.session_id,
      model: node.model,
      systemPrompt: node.system_prompt,
      prompt: node.prompt,
      response: node.response,
      status: node.status,
      errorMessage: node.error_message,
      depth: node.depth,
      promptTokens: node.prompt_tokens || 0,
      responseTokens: node.response_tokens || 0,
      costUsd: node.cost_usd || 0,
      temperature: node.temperature,
      maxTokens: node.max_tokens,
      topP: node.top_p,
      metadata: node.metadata || {},
      createdAt: new Date(node.created_at),
      updatedAt: new Date(node.updated_at),
    }))
    .sort((a: ChatNode, b: ChatNode) => a.depth - b.depth)
  
  const context: Array<{ role: string; content: string }> = []
  
  // Build context from node history
  for (const node of nodes) {
    // Add system prompt if it's the first node and has one
    if (node.systemPrompt && node.depth === 0) {
      context.push({ role: 'system', content: node.systemPrompt })
    }
    
    // Add user prompt
    context.push({ role: 'user', content: node.prompt })
    
    // Add assistant response if available
    if (node.response) {
      context.push({ role: 'assistant', content: node.response })
    }
  }
  
  return context
}

// Fallback function for when CTE is not available
async function buildContextForNodeFallback(nodeId: string): Promise<Array<{ role: string; content: string }>> {
  const supabase = await createClient()
  
  const context: Array<{ role: string; content: string }> = []
  let currentNodeId: string | null = nodeId
  const nodeHistory: ChatNode[] = []
  
  // Build path from current node to root
  while (currentNodeId) {
    const node = await getChatNodeById(currentNodeId)
    if (!node) break
    
    nodeHistory.unshift(node)
    currentNodeId = node.parentId
  }
  
  // Build context from node history
  for (const node of nodeHistory) {
    // Add system prompt if it's the first node and has one
    if (node.systemPrompt && nodeHistory[0].id === node.id) {
      context.push({ role: 'system', content: node.systemPrompt })
    }
    
    // Add user prompt
    context.push({ role: 'user', content: node.prompt })
    
    // Add assistant response if available
    if (node.response) {
      context.push({ role: 'assistant', content: node.response })
    }
  }
  
  return context
}