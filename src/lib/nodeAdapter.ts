import type { Node } from '@/types/session'
import type { ChatNode, NodeStatus } from '@/types'

/**
 * Desktop の Node（role + content の分離モデル）を
 * BalancedTreeView 等が期待する ChatNode 表示形式に変換する。
 *
 * ツリー上の表示単位 = user ノード（prompt）+ その直下の assistant ノード（response）のペア。
 * parentId は assistant ノードを飛ばして "親 user ノード" を指す。
 */
export function buildDisplayNodes(nodes: Node[]): ChatNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const userNodes = nodes.filter((n) => n.role === 'user')

  return userNodes.map((userNode) => {
    // 直下の assistant ノードを探す
    const assistantChild = nodes.find(
      (n) => n.parentId === userNode.id && n.role === 'assistant',
    )

    // displayParentId: assistant ノードを飛ばして祖父 user ノードを指す
    let displayParentId: string | null = null
    if (userNode.parentId) {
      const parent = nodeMap.get(userNode.parentId)
      if (parent?.role === 'assistant') {
        displayParentId = parent.parentId // 祖父 user ノード
      } else {
        displayParentId = userNode.parentId
      }
    }

    // depth 計算（表示ツリー上の深さ）
    const depth = computeDisplayDepth(userNode.id, nodeMap, userNodes)

    // status
    let status: NodeStatus = 'pending'
    if (assistantChild) {
      status = assistantChild.isStreaming ? 'streaming' : 'completed'
    }

    return {
      id: userNode.id,
      parentId: displayParentId,
      sessionId: userNode.sessionId,
      model: assistantChild?.modelId ?? '',
      systemPrompt: null,
      prompt: userNode.content,
      response: assistantChild?.content ?? null,
      status,
      errorMessage: null,
      depth,
      promptTokens: userNode.tokenCount ?? 0,
      responseTokens: assistantChild?.tokenCount ?? 0,
      costUsd: 0,
      temperature: null,
      maxTokens: null,
      topP: null,
      metadata: {},
      createdAt: new Date(userNode.createdAt),
      updatedAt: new Date(userNode.createdAt),
    } satisfies ChatNode
  })
}

function computeDisplayDepth(
  nodeId: string,
  nodeMap: Map<string, Node>,
  userNodes: Node[],
): number {
  const userNodeIds = new Set(userNodes.map((n) => n.id))
  let depth = 0
  let current = nodeMap.get(nodeId)

  while (current && current.parentId) {
    const parent = nodeMap.get(current.parentId)
    if (!parent) break
    // assistant → user と2段上がったら depth++
    if (parent.role === 'assistant' && parent.parentId) {
      const grandparent = nodeMap.get(parent.parentId)
      if (grandparent && userNodeIds.has(grandparent.id)) {
        depth++
        current = grandparent
        continue
      }
    }
    current = parent
  }

  return depth
}

/**
 * 送信時にコンテキストメッセージを構築する。
 * targetNodeId から祖先を辿り、messages 配列を組み立てる。
 */
export interface ContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function buildContextMessages(
  nodes: Node[],
  targetNodeId: string,
  systemPrompt?: string,
): ContextMessage[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const ancestors: Node[] = []

  let current = nodeMap.get(targetNodeId)
  while (current) {
    ancestors.unshift(current)
    current = current.parentId ? nodeMap.get(current.parentId) : undefined
  }

  const messages: ContextMessage[] = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  for (const node of ancestors) {
    if (node.role !== 'system') {
      messages.push({
        role: node.role as 'user' | 'assistant',
        content: node.content,
      })
    }
  }

  return messages
}
