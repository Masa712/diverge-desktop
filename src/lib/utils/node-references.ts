/**
 * Utility functions for extracting and formatting node references
 * These functions are client-side safe
 */

/**
 * Extract node references from user prompt
 * Supports formats: @node_xxx, #xxx, or [[node:xxx]]
 */
export function extractNodeReferences(prompt: string): string[] {
  const references: string[] = []
  
  // Pattern 1: @node_xxx or @xxx (short form)
  const atPattern = /@(?:node_)?([a-f0-9-]{8,})/gi
  let match = atPattern.exec(prompt)
  while (match) {
    references.push(match[1])
    match = atPattern.exec(prompt)
  }
  
  // Pattern 2: #xxx (hash reference)
  const hashPattern = /#([a-f0-9-]{8,})/gi
  match = hashPattern.exec(prompt)
  while (match) {
    references.push(match[1])
    match = hashPattern.exec(prompt)
  }
  
  // Pattern 3: [[node:xxx]] (wiki-style)
  const wikiPattern = /\[\[node:([a-f0-9-]+)\]\]/gi
  match = wikiPattern.exec(prompt)
  while (match) {
    references.push(match[1])
    match = wikiPattern.exec(prompt)
  }
  
  // Remove duplicates
  const uniqueReferences = new Set(references)
  return Array.from(uniqueReferences)
}

/**
 * Get short ID for display purposes
 */
export function getShortNodeId(nodeId: string): string {
  return nodeId.slice(-8)
}

/**
 * Format node reference for user display
 */
export function formatNodeReference(nodeId: string, prompt?: string): string {
  const shortId = getShortNodeId(nodeId)
  if (prompt) {
    const shortPrompt = prompt.slice(0, 30)
    return `@${shortId} "${shortPrompt}${prompt.length > 30 ? '...' : ''}"`
  }
  return `@${shortId}`
}