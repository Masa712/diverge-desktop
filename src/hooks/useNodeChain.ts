import { useState, useEffect } from 'react'
import { ChatNode } from '@/types'

export function useNodeChain(node: ChatNode | null, allNodes: ChatNode[]) {
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0)
  const [nodeChain, setNodeChain] = useState<ChatNode[]>([])

  // Build the parent chain when node changes
  useEffect(() => {
    if (!node || !allNodes.length) {
      setNodeChain([])
      setCurrentNodeIndex(0)
      return
    }

    const chain: ChatNode[] = []
    let currentNode: ChatNode | undefined = node
    const nodeMap = new Map(allNodes.map(n => [n.id, n]))

    // Build chain from current node to root
    while (currentNode) {
      chain.unshift(currentNode) // Add to beginning to maintain order
      currentNode = currentNode.parentId ? nodeMap.get(currentNode.parentId) : undefined
    }

    setNodeChain(chain)
    setCurrentNodeIndex(chain.length - 1) // Start with the clicked node
  }, [node, allNodes])

  // Get current display node (always get the latest version from allNodes)
  const currentDisplayNode = (() => {
    const chainNode = nodeChain[currentNodeIndex]
    if (!chainNode) return chainNode
    
    // Find the latest version of this node from allNodes
    const latestNode = allNodes.find(n => n.id === chainNode.id)
    return latestNode || chainNode
  })()

  const canNavigate = {
    previous: currentNodeIndex > 0,
    next: currentNodeIndex < nodeChain.length - 1
  }

  const navigate = {
    previous: () => setCurrentNodeIndex(prev => Math.max(0, prev - 1)),
    next: () => setCurrentNodeIndex(prev => Math.min(nodeChain.length - 1, prev + 1)),
    toIndex: (index: number) => setCurrentNodeIndex(Math.max(0, Math.min(nodeChain.length - 1, index)))
  }

  return {
    currentDisplayNode,
    nodeChain,
    currentNodeIndex,
    canNavigate,
    navigate
  }
}