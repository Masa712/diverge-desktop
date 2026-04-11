'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Position,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './mobile-optimizations.css'
import { ChatNode } from '@/types'
import { MessageNode } from './message-node'
import { CompactTreeLayout, TreeNode, NodePosition } from './CompactTreeLayout'
import { log } from '@/lib/utils/logger'

interface Props {
  nodes: ChatNode[]
  currentNodeId?: string
  onNodeClick?: (nodeId: string) => void
  onNodeIdClick?: (nodeReference: string) => void
  onBackgroundClick?: () => void
  isLeftSidebarCollapsed?: boolean
  isRightSidebarOpen?: boolean
  rightSidebarWidth?: number
  /** Bumped by App.tsx when a sidebar drag ends — triggers a single re-center */
  resizeDoneToken?: number
}

const nodeTypes = {
  message: MessageNode,
}

const COMPACT_LAYOUT_CONFIG = {
  horizontalSpacing: 250,
  verticalSpacing: 350,
  nodeWidth: 280,
  minSubtreeSpacing: 150,
}

// サイドバー定数（App.tsx のレイアウト値と一致させる）
const SIDEBAR_CONSTANTS = {
  LEFT_SIDEBAR_EXPANDED: 260,
  LEFT_SIDEBAR_COLLAPSED: 52,
  LEFT_SIDEBAR_MARGIN: 20,
  RIGHT_SIDEBAR_MARGIN: 20,
  RIGHT_SIDEBAR_DEFAULT_WIDTH: 400,
  ANIMATION_DURATION: 800,
} as const

// センタリング用定数
const CENTERING_CONSTANTS = {
  NODE_WIDTH: 280,             // ノードの幅（COMPACT_LAYOUT_CONFIG.nodeWidth）
  NODE_HEIGHT: 100,            // ノードの概算高さ
  X_ADJUSTMENT: -25,           // X軸の微調整値（負の値で左に移動）
  Y_ADJUSTMENT: -150,          // Y軸の微調整値（負の値で上に移動、正の値で下に移動）
  CENTER_Y_OFFSET: 150,        // setCenter 用: 正の値でノードをキャンバス中央より上に配置
  // モバイル/タブレット用の微調整値
  MOBILE_X_ADJUSTMENT: -20,
  MOBILE_Y_ADJUSTMENT: -180,
  TABLET_X_ADJUSTMENT: -20,
  TABLET_Y_ADJUSTMENT: -180,
} as const

// Inner component that uses ReactFlow hooks
function CompactTreeViewInner({
  nodes: chatNodes,
  currentNodeId,
  onNodeClick,
  onNodeIdClick,
  onBackgroundClick,
  isLeftSidebarCollapsed = false,
  isRightSidebarOpen = false,
  rightSidebarWidth = SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_DEFAULT_WIDTH,
  resizeDoneToken,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { setCenter, getZoom, setViewport, getNodes } = useReactFlow()
  // Keep sidebar width in a ref so centerOnNode always reads the latest value
  // without needing it as a dependency (avoids re-centering on every drag frame).
  const rightSidebarWidthRef = useRef(rightSidebarWidth)
  useEffect(() => { rightSidebarWidthRef.current = rightSidebarWidth }, [rightSidebarWidth])
  const layoutEngine = useRef(new CompactTreeLayout(COMPACT_LAYOUT_CONFIG))
  const positionsRef = useRef<Map<string, NodePosition>>(new Map())
  const prevSessionIdRef = useRef<string | null>(null)
  const prevNodeCountRef = useRef<number>(0)
  const isReactFlowInitialized = useRef(false)

  // Helper function to get actual node position (from positions map or React Flow nodes)
  const getActualNodePosition = useCallback((nodeId: string) => {
    // First try to get from positions map
    const mapPosition = positionsRef.current.get(nodeId)
    if (mapPosition) {
      return { x: mapPosition.x, y: mapPosition.y }
    }
    
    // Fallback to React Flow nodes
    const node = getNodes().find(n => n.id === nodeId)
    if (node) {
      return node.position
    }
    
    return { x: 0, y: 0 }
  }, [getNodes])

  // Convert ChatNodes to TreeNodes
  const convertToTreeNodes = useCallback((chatNodes: ChatNode[]): TreeNode[] => {
    return chatNodes.map(node => {
      try {
        return {
          id: node.id,
          parentId: node.parentId,
          depth: node.depth,
          children: [], // Will be populated by layout engine
          createdAt: node.createdAt instanceof Date ? node.createdAt : new Date(node.createdAt),
        }
      } catch (error) {
        // Fallback: use current date if createdAt is invalid
        return {
          id: node.id,
          parentId: node.parentId,
          depth: node.depth,
          children: [],
          createdAt: new Date(),
        }
      }
    })
  }, [])
  
  // Center the viewport on a node accounting for sidebar overlays.
  // The tree view fills the entire screen, so we manually calculate the
  // visible content center between the left and right sidebars.
  const centerOnNode = useCallback((nodeId: string, duration: number = SIDEBAR_CONSTANTS.ANIMATION_DURATION) => {
    const position = getActualNodePosition(nodeId)
    const zoom = Math.max(getZoom(), 0.8)

    const screenW = window.innerWidth
    const screenH = window.innerHeight

    const leftEdge = isLeftSidebarCollapsed
      ? SIDEBAR_CONSTANTS.LEFT_SIDEBAR_COLLAPSED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
      : SIDEBAR_CONSTANTS.LEFT_SIDEBAR_EXPANDED  + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN

    const rightEdge = isRightSidebarOpen
      ? rightSidebarWidthRef.current + SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_MARGIN
      : 0

    const contentCenterX = leftEdge + (screenW - leftEdge - rightEdge) / 2
    const contentCenterY = screenH / 2

    const vx = contentCenterX - (position.x + CENTERING_CONSTANTS.NODE_WIDTH  / 2) * zoom + CENTERING_CONSTANTS.X_ADJUSTMENT
    const vy = contentCenterY - (position.y + CENTERING_CONSTANTS.NODE_HEIGHT / 2) * zoom + CENTERING_CONSTANTS.Y_ADJUSTMENT

    setViewport({ x: vx, y: vy, zoom }, { duration })
  }, [getActualNodePosition, getZoom, setViewport, isLeftSidebarCollapsed, isRightSidebarOpen])

  // Node click handler — always center on clicked node
  const handleNodeClick = useCallback((nodeId: string) => {
    onNodeClick?.(nodeId)
    log.debug('Node clicked', { nodeId })
    centerOnNode(nodeId)
  }, [onNodeClick, centerOnNode])

  // Convert chat nodes to React Flow nodes and edges with balanced layout
  useEffect(() => {
    if (!chatNodes || chatNodes.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

//     console.log(`🌳 CompactTreeView: Processing ${chatNodes.length} nodes`)

    try {
      // Convert to tree nodes
      const treeNodes = convertToTreeNodes(chatNodes)
      
      // Calculate positions using compact layout
      const positions = layoutEngine.current.calculateLayout(treeNodes)
      
      // Store positions for later use
      positionsRef.current = positions

//       console.log(`📍 Calculated positions for ${positions.size} nodes`)

      // Create React Flow nodes
      const reactFlowNodes: Node[] = []
      const nodeMap = new Map<string, ChatNode>()
      
      chatNodes.forEach(node => nodeMap.set(node.id, node))

      positions.forEach((position, nodeId) => {
        const chatNode = nodeMap.get(nodeId)
        if (!chatNode) return

        const isCurrentNode = nodeId === currentNodeId
        const subtreeWidth = layoutEngine.current.getSubtreeWidth(nodeId)

        reactFlowNodes.push({
          id: nodeId,
          type: 'message',
          position: { x: position.x, y: position.y },
          data: {
            node: chatNode,
            isCurrentNode,
            subtreeWidth,
            onNodeClick: handleNodeClick,
            onNodeIdClick,
          },
          draggable: false,
          selectable: true,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        })
      })

      // Create edges - separate into normal and highlighted to ensure proper z-index
      const normalEdges: Edge[] = []
      const highlightedEdges: Edge[] = []

      chatNodes.forEach(node => {
        if (node.parentId) {
          const parentPos = positions.get(node.parentId)
          const childPos = positions.get(node.id)

          if (parentPos && childPos) {
            const isHighlighted = isCurrentPath(node.id, currentNodeId, chatNodes)
            const edge: Edge = {
              id: `${node.parentId}-${node.id}`,
              source: node.parentId,
              target: node.id,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: isHighlighted ? '#3b82f6' : '#e5e7eb',
                strokeWidth: isHighlighted ? 3 : 2,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: isHighlighted ? '#3b82f6' : '#e5e7eb',
              },
            }

            // Add to appropriate array - highlighted edges go last for proper z-index
            if (isHighlighted) {
              highlightedEdges.push(edge)
            } else {
              normalEdges.push(edge)
            }
          }
        }
      })

      // Combine edges: normal edges first, then highlighted edges (so highlighted appear on top)
      const reactFlowEdges: Edge[] = [...normalEdges, ...highlightedEdges]

      setNodes(reactFlowNodes)
      setEdges(reactFlowEdges)

      // Detect session change / initial load
      const currentSessionId = chatNodes[0]?.sessionId || null
      const isSessionChanged = currentSessionId && currentSessionId !== prevSessionIdRef.current
      const isInitialLoad = prevSessionIdRef.current === null && currentSessionId !== null

      if (isSessionChanged || isInitialLoad) {
        // Center on root node when session changes or on first load
        const rootNode = chatNodes.find(n => n.parentId === null) || chatNodes[0]
        if (rootNode) {
          const doCenter = () => centerOnNode(rootNode.id, isInitialLoad ? 0 : SIDEBAR_CONSTANTS.ANIMATION_DURATION)
          if (isInitialLoad) {
            const waitForInit = () => {
              if (isReactFlowInitialized.current) { doCenter() }
              else { setTimeout(waitForInit, 100) }
            }
            setTimeout(waitForInit, 100)
          } else {
            setTimeout(doCenter, 100)
          }
        }
        prevSessionIdRef.current = currentSessionId
      } else if (
        chatNodes.length > prevNodeCountRef.current ||
        (currentNodeId && chatNodes.find(n => n.id === currentNodeId && n.status === 'streaming'))
      ) {
        // New node added — center on streaming / current node
        const nodeToCenter =
          chatNodes.find(n => n.status === 'streaming') ||
          (currentNodeId ? chatNodes.find(n => n.id === currentNodeId) : null) ||
          chatNodes[chatNodes.length - 1]
        if (nodeToCenter) {
          setTimeout(() => centerOnNode(nodeToCenter.id), 100)
        }
      }

      prevNodeCountRef.current = chatNodes.length

    } catch (error) {
      console.error('[BalancedTreeView] layout error - clearing nodes!', error)
      log.error('Error in BalancedTreeView layout calculation', error)
      setNodes([])
      setEdges([])
    }
  }, [chatNodes, currentNodeId, layoutEngine, convertToTreeNodes, handleNodeClick, setCenter, getZoom, isLeftSidebarCollapsed, isRightSidebarOpen])

  // Check if a node is in the current path
  const isCurrentPath = useCallback((nodeId: string, currentNodeId: string | undefined, nodes: ChatNode[]): boolean => {
    if (!currentNodeId) return false
    
    const nodeMap = new Map<string, ChatNode>()
    nodes.forEach(node => nodeMap.set(node.id, node))
    
    // Build path from current node to root
    const currentPath = new Set<string>()
    let current: ChatNode | undefined = nodeMap.get(currentNodeId)
    
    while (current) {
      currentPath.add(current.id)
      current = current.parentId ? nodeMap.get(current.parentId) : undefined
    }
    
    return currentPath.has(nodeId)
  }, [])

  // Re-center when left sidebar collapses/expands or right sidebar opens/closes.
  useEffect(() => {
    if (!positionsRef.current || positionsRef.current.size === 0) return
    if (!currentNodeId) return
    centerOnNode(currentNodeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeftSidebarCollapsed, isRightSidebarOpen])

  // Re-center once after a sidebar drag ends (resizeDoneToken is bumped on mouseup).
  useEffect(() => {
    if (resizeDoneToken === undefined || resizeDoneToken === 0) return
    if (!positionsRef.current || positionsRef.current.size === 0) return
    if (!currentNodeId) return
    centerOnNode(currentNodeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeDoneToken])

  const fitViewOptions = useMemo(() => ({
    padding: 0.2,
    includeHiddenNodes: false,
    minZoom: 0.1,
    maxZoom: 1.5,
  }), [])

  // Handle React Flow initialization
  const handleInit = useCallback(() => {
    isReactFlowInitialized.current = true
    log.debug('React Flow initialized')
    if (chatNodes && chatNodes.length > 0) {
      const rootNode = chatNodes.find(n => n.parentId === null) || chatNodes[0]
      centerOnNode(rootNode.id, 0)
    }
  }, [chatNodes, centerOnNode])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView={false}
        fitViewOptions={fitViewOptions}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 900, y: 250, zoom: 0.8 }}
        onPaneClick={onBackgroundClick}
        onInit={handleInit}
      >
      </ReactFlow>
    </div>
  )
}

// Test data generator for development
export function generateCompactTestData(): ChatNode[] {
  const nodes: ChatNode[] = []
  
  // Root node
  nodes.push({
    id: 'root-1',
    parentId: null,
    sessionId: 'test-session',
    model: 'openai/gpt-4o-2024-11-20' as any,
    systemPrompt: null,
    prompt: 'ホテル経営について教えてください',
    response: 'ホテル経営の基本について説明します...',
    status: 'completed',
    errorMessage: null,
    depth: 0,
    promptTokens: 50,
    responseTokens: 100,
    costUsd: 0.01,
    temperature: null,
    maxTokens: null,
    topP: null,
    metadata: {},
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  })
  
  // Child A with 5 grandchildren (unbalanced)
  nodes.push({
    id: 'child-a',
    parentId: 'root-1',
    sessionId: 'test-session',
    model: 'openai/gpt-4o-2024-11-20' as any,
    systemPrompt: null,
    prompt: '顧客サービスについて詳しく',
    response: '顧客サービスの詳細について...',
    status: 'completed',
    errorMessage: null,
    depth: 1,
    promptTokens: 40,
    responseTokens: 80,
    costUsd: 0.008,
    temperature: null,
    maxTokens: null,
    topP: null,
    metadata: {},
    createdAt: new Date('2024-01-01T10:01:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
  })
  
  // Child B with 1 grandchild
  nodes.push({
    id: 'child-b',
    parentId: 'root-1',
    sessionId: 'test-session',
    model: 'anthropic/claude-sonnet-4' as any,
    systemPrompt: null,
    prompt: '運営効率について',
    response: '運営効率の改善方法...',
    status: 'completed',
    errorMessage: null,
    depth: 1,
    promptTokens: 35,
    responseTokens: 70,
    costUsd: 0.007,
    temperature: null,
    maxTokens: null,
    topP: null,
    metadata: {},
    createdAt: new Date('2024-01-01T10:02:00Z'),
    updatedAt: new Date('2024-01-01T10:02:00Z'),
  })
  
  // Child C with no grandchildren
  nodes.push({
    id: 'child-c',
    parentId: 'root-1',
    sessionId: 'test-session',
    model: 'google/gemini-2.5-flash',
    systemPrompt: null,
    prompt: '財務管理について',
    response: '財務管理のポイント...',
    status: 'completed',
    errorMessage: null,
    depth: 1,
    promptTokens: 30,
    responseTokens: 60,
    costUsd: 0.005,
    temperature: null,
    maxTokens: null,
    topP: null,
    metadata: {},
    createdAt: new Date('2024-01-01T10:03:00Z'),
    updatedAt: new Date('2024-01-01T10:03:00Z'),
  })
  
  // 5 grandchildren under Child A
  for (let i = 1; i <= 5; i++) {
    nodes.push({
      id: `grandchild-a-${i}`,
      parentId: 'child-a',
      sessionId: 'test-session',
      model: 'openai/gpt-4o-2024-11-20' as any,
      systemPrompt: null,
      prompt: `顧客サービスの詳細 ${i}`,
      response: `詳細な回答 ${i}...`,
      status: 'completed',
      errorMessage: null,
      depth: 2,
      promptTokens: 25,
      responseTokens: 50,
      costUsd: 0.004,
      temperature: null,
      maxTokens: null,
      topP: null,
      metadata: {},
      createdAt: new Date(`2024-01-01T10:0${3 + i}:00Z`),
      updatedAt: new Date(`2024-01-01T10:0${3 + i}:00Z`),
    })
  }
  
  // 1 grandchild under Child B
  nodes.push({
    id: 'grandchild-b-1',
    parentId: 'child-b',
    sessionId: 'test-session',
    model: 'anthropic/claude-sonnet-4' as any,
    systemPrompt: null,
    prompt: '運営効率の具体例',
    response: '具体的な効率化手法...',
    status: 'completed',
    errorMessage: null,
    depth: 2,
    promptTokens: 30,
    responseTokens: 60,
    costUsd: 0.006,
    temperature: null,
    maxTokens: null,
    topP: null,
    metadata: {},
    createdAt: new Date('2024-01-01T10:09:00Z'),
    updatedAt: new Date('2024-01-01T10:09:00Z'),
  })
  
  return nodes
}

// Wrapper component with ReactFlowProvider
export function CompactTreeView(props: Props) {
  return (
    <ReactFlowProvider>
      <CompactTreeViewInner {...props} />
    </ReactFlowProvider>
  )
}
