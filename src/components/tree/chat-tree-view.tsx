'use client'

import { ChatNode } from '@/types'
import { CompactTreeView } from './BalancedTreeView'

interface Props {
  nodes: ChatNode[]
  currentNodeId?: string
  onNodeClick?: (nodeId: string) => void
  onNodeIdClick?: (nodeReference: string) => void
  onBackgroundClick?: () => void
  isLeftSidebarCollapsed?: boolean
  isRightSidebarOpen?: boolean
  rightSidebarWidth?: number
}

export function ChatTreeView({ 
  nodes: chatNodes, 
  currentNodeId, 
  onNodeClick, 
  onNodeIdClick,
  onBackgroundClick,
  isLeftSidebarCollapsed,
  isRightSidebarOpen,
  rightSidebarWidth
}: Props) {
  // Always use CompactTreeView - simplified implementation
  return (
    <CompactTreeView
      nodes={chatNodes}
      currentNodeId={currentNodeId}
      onNodeClick={onNodeClick}
      onNodeIdClick={onNodeIdClick}
      onBackgroundClick={onBackgroundClick}
      isLeftSidebarCollapsed={isLeftSidebarCollapsed}
      isRightSidebarOpen={isRightSidebarOpen}
      rightSidebarWidth={rightSidebarWidth}
    />
  )
}