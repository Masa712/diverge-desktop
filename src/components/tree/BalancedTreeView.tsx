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

// 統一されたサイドバー定数（実際のCSS値と一致）
const SIDEBAR_CONSTANTS = {
  LEFT_SIDEBAR_EXPANDED: 350,   // lg:w-[350px] - 展開時の実際の幅
  LEFT_SIDEBAR_COLLAPSED: 64,   // w-16 - 折りたたみ時の実際の幅（16 * 4px = 64px）
  LEFT_SIDEBAR_MARGIN: 30,      // left-[30px] - 左マージン
  RIGHT_SIDEBAR_MARGIN: 30,     // right-[30px] - 右マージン
  RIGHT_SIDEBAR_DEFAULT_WIDTH: 400, // 右サイドバーのデフォルト幅
  BASE_X_OFFSET: 0,            // ベースX軸オフセット
  BASE_Y_OFFSET: 0,            // ベースY軸オフセット
  CUSTOM_X_ADJUSTMENT: 0,      // カスタムX軸調整値
  ANIMATION_DURATION: 800,     // アニメーション時間
  MOBILE_BREAKPOINT: 768,      // モバイル判定のブレークポイント
  TABLET_BREAKPOINT: 1024,     // タブレット判定のブレークポイント
} as const

// センタリング用定数
const CENTERING_CONSTANTS = {
  NODE_WIDTH: 280,             // ノードの幅（COMPACT_LAYOUT_CONFIG.nodeWidth）
  NODE_HEIGHT: 100,            // ノードの概算高さ
  X_ADJUSTMENT: -25,           // X軸の微調整値（負の値で左に移動）
  Y_ADJUSTMENT: -150,          // Y軸の微調整値（負の値で上に移動、正の値で下に移動）
  // モバイル/タブレット用の微調整値
  MOBILE_X_ADJUSTMENT: -20,      // モバイル用X軸の微調整値（負の値で左、正の値で右）
  MOBILE_Y_ADJUSTMENT: -180,    // モバイル用Y軸の微調整値（負の値で上、正の値で下）
  TABLET_X_ADJUSTMENT: -20,      // タブレット用X軸の微調整値（負の値で左、正の値で右）
  TABLET_Y_ADJUSTMENT: -180,    // タブレット用Y軸の微調整値（負の値で上、正の値で下）
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
  rightSidebarWidth = SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_DEFAULT_WIDTH
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { setCenter, getZoom, setViewport, getNodes } = useReactFlow()
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

  // Unified centering calculation function
  const calculateCenteringViewport = useCallback((params: {
    nodePosition: { x: number, y: number }
    contentCenterX: number
    contentCenterY: number
    zoom: number
    isMobile?: boolean
    isTablet?: boolean
  }) => {
    const { nodePosition, contentCenterX, contentCenterY, zoom, isMobile = false, isTablet = false } = params
    
     // モバイル・タブレット用の固定オフセット
     if (isMobile || isTablet) {
       // デバイスに応じた微調整値を使用
       const xAdjustment = isMobile 
         ? CENTERING_CONSTANTS.MOBILE_X_ADJUSTMENT 
         : CENTERING_CONSTANTS.TABLET_X_ADJUSTMENT
       const yAdjustment = isMobile 
         ? CENTERING_CONSTANTS.MOBILE_Y_ADJUSTMENT 
         : CENTERING_CONSTANTS.TABLET_Y_ADJUSTMENT
       
       // モバイル用の適切なセンタリング計算
       // デスクトップと同じノード幅・高さを使用（レイアウトエンジンの計算と一致させる）
       const nodeWidth = CENTERING_CONSTANTS.NODE_WIDTH
       const nodeHeight = CENTERING_CONSTANTS.NODE_HEIGHT
       
       const newX = contentCenterX - (nodePosition.x + nodeWidth / 2) * zoom + xAdjustment
       const newY = contentCenterY - (nodePosition.y + nodeHeight / 2) * zoom + yAdjustment
      
      console.log('📱 Mobile/Tablet Centering:', {
        device: isMobile ? 'mobile' : 'tablet',
        nodePosition,
        contentCenterX,
        contentCenterY,
        zoom,
        adjustments: { x: xAdjustment, y: yAdjustment },
        calculation: {
          nodeWidth,
          nodeHeight,
          nodeCenterX: nodePosition.x + nodeWidth / 2,
          nodeCenterY: nodePosition.y + nodeHeight / 2,
          baseX: contentCenterX - (nodePosition.x + nodeWidth / 2) * zoom,
          baseY: contentCenterY - (nodePosition.y + nodeHeight / 2) * zoom
        },
        calculatedViewport: { x: newX, y: newY }
      })
      
      return { x: newX, y: newY }
    }
    
    // デスクトップ用の計算
    const newX = contentCenterX - (nodePosition.x + CENTERING_CONSTANTS.NODE_WIDTH / 2) * zoom + CENTERING_CONSTANTS.X_ADJUSTMENT
    const newY = contentCenterY - (nodePosition.y + CENTERING_CONSTANTS.NODE_HEIGHT / 2) * zoom + CENTERING_CONSTANTS.Y_ADJUSTMENT
    
    // デバッグログを追加
    console.log('🎯 Desktop Centering Function Called:', {
      nodePosition,
      contentCenterX,
      contentCenterY,
      zoom,
      X_ADJUSTMENT: CENTERING_CONSTANTS.X_ADJUSTMENT,
      Y_ADJUSTMENT: CENTERING_CONSTANTS.Y_ADJUSTMENT,
      calculatedViewport: { x: newX, y: newY },
      calculation: {
        baseX: contentCenterX - (nodePosition.x + CENTERING_CONSTANTS.NODE_WIDTH / 2) * zoom,
        baseY: contentCenterY - (nodePosition.y + CENTERING_CONSTANTS.NODE_HEIGHT / 2) * zoom,
        xAdjustmentApplied: CENTERING_CONSTANTS.X_ADJUSTMENT,
        yAdjustmentApplied: CENTERING_CONSTANTS.Y_ADJUSTMENT,
        finalX: newX,
        finalY: newY
      }
    })
    
    return { x: newX, y: newY }
  }, [])


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
  
  // Node click handler (with centering on mobile/tablet)
  const handleNodeClick = useCallback((nodeId: string) => {
    // Call original handler
    onNodeClick?.(nodeId)
    log.debug('Node clicked', { nodeId })
    
    // Center on clicked node for mobile/tablet devices
    const screenWidth = window.innerWidth
    const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
    const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
    
    // Debug device detection
    console.log('🔍 Node Click Device Detection:', {
      screenWidth,
      isMobile,
      isTablet,
      mobileBreakpoint: SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT,
      tabletBreakpoint: SIDEBAR_CONSTANTS.TABLET_BREAKPOINT,
      willCenter: isMobile || isTablet
    })
    
    if (isMobile || isTablet) {
       // Get node position
       const position = getActualNodePosition(nodeId)
       if (position) {
         const currentZoom = getZoom()
         // モバイル・タブレット用のズーム設定（固定値を使用して一貫性を保つ）
         const zoom = isMobile ? 0.6 : 0.8  // タブレットも固定値0.8を使用
        
        // Calculate content center for mobile/tablet
        const screenHeight = window.innerHeight
        const contentCenterX = screenWidth / 2
        const contentCenterY = screenHeight / 2
        
        // Use unified centering function
        const viewport = calculateCenteringViewport({
          nodePosition: position,
          contentCenterX,
          contentCenterY,
          zoom,
          isMobile,
          isTablet
        })
        
        // タブレットの調整値を確認
        console.log('🎯 Tablet Tap Centering Debug:', {
          device: isTablet ? 'tablet' : 'mobile',
          adjustments: {
            x: isTablet ? CENTERING_CONSTANTS.TABLET_X_ADJUSTMENT : CENTERING_CONSTANTS.MOBILE_X_ADJUSTMENT,
            y: isTablet ? CENTERING_CONSTANTS.TABLET_Y_ADJUSTMENT : CENTERING_CONSTANTS.MOBILE_Y_ADJUSTMENT
          },
          calculatedViewport: viewport,
          nodePosition: position,
          contentCenter: { x: contentCenterX, y: contentCenterY }
        })
        
        // Apply centering with smooth animation
        setViewport({
          x: viewport.x,
          y: viewport.y,
          zoom: zoom
        }, { duration: SIDEBAR_CONSTANTS.ANIMATION_DURATION })
        
        log.debug('Centered on clicked node', {
          nodeId,
          device: isMobile ? 'mobile' : 'tablet',
          zoom: zoom,
          currentZoom,
          viewportCalculation: {
            screenWidth,
            screenHeight,
            contentCenterX,
            contentCenterY,
            nodePosition: position,
            calculatedViewport: { x: viewport.x, y: viewport.y }
          }
        })
      }
    }
  }, [onNodeClick, getActualNodePosition, getZoom, calculateCenteringViewport, setViewport])

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

      // Detect session change by checking if the first node's session ID changed
      const currentSessionId = chatNodes[0]?.sessionId || null
      const isSessionChanged = currentSessionId && currentSessionId !== prevSessionIdRef.current
      
      // Also check if this is the first render with nodes (initial load)
      const isInitialLoad = prevSessionIdRef.current === null && currentSessionId !== null
      
      // Check if this is a new session or initial load
      if (isSessionChanged || isInitialLoad) {
        // New session opened or initial load - center on the first/root node
        log.info(isInitialLoad ? 'Initial session load' : 'Session changed', { 
          sessionId: currentSessionId,
          isInitialLoad 
        })
        const rootNode = chatNodes.find(n => n.parentId === null) || chatNodes[0]
        
        if (rootNode && (positions.has(rootNode.id) || getNodes().find(n => n.id === rootNode.id))) {
          const position = getActualNodePosition(rootNode.id)
          
          // Function to perform centering
          const performCentering = () => {
            // ズーム設定
            const zoom = 0.8
            
            // コンテンツエリアの中心に配置するための座標計算
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            
            // デバイス判定
            const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
            const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
            
            // モバイル・タブレットでは異なる中心計算
            let contentCenterX: number
            let contentCenterY: number
            
            if (isMobile || isTablet) {
              // モバイル・タブレット: 画面全体の中心を使用
              contentCenterX = screenWidth / 2
              contentCenterY = screenHeight / 2
            } else {
              // デスクトップ: サイドバーを考慮した中心
              const leftWidth = isLeftSidebarCollapsed 
                ? SIDEBAR_CONSTANTS.LEFT_SIDEBAR_COLLAPSED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
                : SIDEBAR_CONSTANTS.LEFT_SIDEBAR_EXPANDED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
              
              const rightWidth = isRightSidebarOpen 
                ? rightSidebarWidth + SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_MARGIN
                : 0
              
              const availableWidth = screenWidth - leftWidth - rightWidth
              contentCenterX = leftWidth + (availableWidth / 2)
              contentCenterY = screenHeight / 2
            }
            
            // 統一されたセンタリング関数を使用
            const viewport = calculateCenteringViewport({
              nodePosition: position,
              contentCenterX,
              contentCenterY,
              zoom,
              isMobile,
              isTablet
            })
            
            // ビューポートを設定
            setViewport({
              x: viewport.x,
              y: viewport.y,
              zoom: zoom
            }, { duration: isInitialLoad ? 0 : SIDEBAR_CONSTANTS.ANIMATION_DURATION })
            
            // Log centering action
            log.debug('Centered root node (direct viewport)', {
              nodeId: rootNode.id,
              zoom: zoom,
              isInitialLoad,
              device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
              viewportCalculation: {
                screenWidth,
                screenHeight,
                contentCenterX,
                contentCenterY,
                nodePosition: position,
                calculatedViewport: { x: viewport.x, y: viewport.y }
              }
            })
          }
          
          if (isInitialLoad) {
            // For initial load, wait for React Flow to be initialized
            const checkAndCenter = () => {
              if (isReactFlowInitialized.current) {
                performCentering()
              } else {
                setTimeout(checkAndCenter, 100)
              }
            }
            setTimeout(checkAndCenter, 100)
          } else {
            // For session changes, center immediately
            setTimeout(performCentering, 100)
          }
        }
        
        // Update session ID reference
        prevSessionIdRef.current = currentSessionId
      } else if (chatNodes.length > prevNodeCountRef.current || 
          (currentNodeId && chatNodes.find(n => n.id === currentNodeId && n.status === 'streaming'))) {
        // New node was added (not a new session) - center on streaming/newest node
        const nodeToCenter = chatNodes.find(n => n.status === 'streaming') || 
                            (currentNodeId ? chatNodes.find(n => n.id === currentNodeId) : null) ||
                            chatNodes[chatNodes.length - 1]
        
        if (nodeToCenter && (positions.has(nodeToCenter.id) || getNodes().find(n => n.id === nodeToCenter.id))) {
          const position = getActualNodePosition(nodeToCenter.id)
          setTimeout(() => {
            const currentZoom = getZoom()
            
            // 現在のズームを維持するか0.8を使用
            const zoom = currentZoom > 0.8 ? currentZoom : 0.8
            
            // コンテンツエリア中心へのセンタリング
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            
            // デバイス判定
            const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
            const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
            
            // モバイル・タブレットでは異なる中心計算
            let contentCenterX: number
            let contentCenterY: number
            
            if (isMobile || isTablet) {
              // モバイル・タブレット: 画面全体の中心を使用
              contentCenterX = screenWidth / 2
              contentCenterY = screenHeight / 2
            } else {
              // デスクトップ: サイドバーを考慮した中心
              const leftWidth = isLeftSidebarCollapsed 
                ? SIDEBAR_CONSTANTS.LEFT_SIDEBAR_COLLAPSED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
                : SIDEBAR_CONSTANTS.LEFT_SIDEBAR_EXPANDED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
              
              const rightWidth = isRightSidebarOpen 
                ? rightSidebarWidth + SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_MARGIN
                : 0
              
              const availableWidth = screenWidth - leftWidth - rightWidth
              contentCenterX = leftWidth + (availableWidth / 2)
              contentCenterY = screenHeight / 2
            }
            
            // 統一されたセンタリング関数を使用
            const viewport = calculateCenteringViewport({
              nodePosition: position,
              contentCenterX,
              contentCenterY,
              zoom,
              isMobile,
              isTablet
            })
            
            setViewport({
              x: viewport.x,
              y: viewport.y,
              zoom: zoom
            }, { duration: SIDEBAR_CONSTANTS.ANIMATION_DURATION })
            
            log.debug('Centered on new node (direct viewport)', {
              nodeId: nodeToCenter.id,
              zoom: zoom,
              currentZoom,
              device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
              viewportCalculation: {
                screenWidth,
                screenHeight,
                contentCenterX,
                contentCenterY,
                nodePosition: position,
                calculatedViewport: { x: viewport.x, y: viewport.y }
              }
            })
          }, 100)
        }
      }
      
      // Update the previous node count
      prevNodeCountRef.current = chatNodes.length

    } catch (error) {
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

  // Handle sidebar width changes without re-rendering nodes
  // This effect only adjusts the view position when right sidebar width changes
  useEffect(() => {
    // Skip if we don't have positions or nodes
    if (!positionsRef.current || positionsRef.current.size === 0) return
    
    // If we have a current node, re-center on it with new width
    if (currentNodeId && (positionsRef.current.has(currentNodeId) || getNodes().find(n => n.id === currentNodeId))) {
      const position = getActualNodePosition(currentNodeId)
      const currentZoom = getZoom()
      
      // デバイス判定
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
      const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
      
      // モバイルでは調整不要
      if (isMobile) {
        return
      }
      
      // 現在のズームを維持（タブレットは固定値）
      const zoom = isTablet ? 0.8 : (currentZoom > 0.8 ? currentZoom : 0.8)
      
      // コンテンツエリア中心の計算
      let contentCenterX: number
      let contentCenterY: number
      
      if (isTablet) {
        // タブレット: 画面全体の中心を使用（サイドバーの影響を受けない）
        contentCenterX = screenWidth / 2
        contentCenterY = screenHeight / 2
      } else {
        // デスクトップ: サイドバーを考慮した中心
        const leftWidth = isLeftSidebarCollapsed 
          ? SIDEBAR_CONSTANTS.LEFT_SIDEBAR_COLLAPSED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
          : SIDEBAR_CONSTANTS.LEFT_SIDEBAR_EXPANDED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
        
        const rightWidth = isRightSidebarOpen 
          ? rightSidebarWidth + SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_MARGIN
          : 0
        
        const availableWidth = screenWidth - leftWidth - rightWidth
        contentCenterX = leftWidth + (availableWidth / 2)
        contentCenterY = screenHeight / 2
      }
      
      // 統一されたセンタリング関数を使用
      const viewport = calculateCenteringViewport({
        nodePosition: position,
        contentCenterX,
        contentCenterY,
        zoom,
        isMobile,
        isTablet
      })
      
      setViewport({
        x: viewport.x,
        y: viewport.y,
        zoom: zoom
      }, { duration: SIDEBAR_CONSTANTS.ANIMATION_DURATION })
      
      log.debug('Adjusted view for sidebar width change (direct viewport)', {
        device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
        rightSidebarWidth,
        nodeId: currentNodeId,
        zoom: zoom,
        currentZoom,
        viewportCalculation: {
          screenWidth,
          screenHeight,
          contentCenterX,
          contentCenterY,
          nodePosition: position,
          calculatedViewport: { x: viewport.x, y: viewport.y }
        }
      })
    }
  }, [rightSidebarWidth, currentNodeId, getZoom, setViewport, isLeftSidebarCollapsed, isRightSidebarOpen, getActualNodePosition, calculateCenteringViewport]) // Only react to sidebar width changes

  const fitViewOptions = useMemo(() => ({
    padding: 0.2,
    includeHiddenNodes: false,
    minZoom: 0.1,
    maxZoom: 1.5,
  }), [])

  // Optimize for mobile and tablet devices
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
  const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
  
  // ブラウザのレスポンシブモードでも動作するように修正
  // 画面幅ベースで判定し、実際のタッチデバイスかどうかは問わない
  const shouldUseTouchOptimizations = isMobile || isTablet
  
  // Touch device specific performance settings (mobile + tablet)
  const touchOptimizations = useMemo(() => {
    // ブラウザのレスポンシブモードでも動作するように画面幅ベースで判定
    if (!shouldUseTouchOptimizations) return {}
    
    return {
      elevateNodesOnSelect: false,
      nodesDraggable: false,  // ドラッグを無効化（パンとの衝突を防ぐ）
      nodesConnectable: false,
      elementsSelectable: true,
      panOnDrag: true, // シンプルにtrueに設定（全てのドラッグでパン）
      selectNodesOnDrag: false,
      zoomOnPinch: true,
      panOnScroll: true, // モバイルではスクロールでパンを許可
      zoomOnScroll: false,
      zoomOnDoubleClick: false,
    }
  }, [shouldUseTouchOptimizations])

  // Handle React Flow initialization
  const handleInit = useCallback(() => {
    isReactFlowInitialized.current = true
    log.debug('React Flow initialized')
    
    // If we have nodes on initialization, center on the root node
    // This handles the initial load case (root -> session)
    if (chatNodes && chatNodes.length > 0 && (positionsRef.current.size > 0 || getNodes().length > 0)) {
      const rootNode = chatNodes.find(n => n.parentId === null) || chatNodes[0]
      const position = getActualNodePosition(rootNode.id)
      
      if (position) {
        // 初期ズーム設定
        const zoom = 0.8
        
        // コンテンツエリア中心への初期センタリング
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight
        
        // デバイス判定
        const isMobile = screenWidth < SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT
        const isTablet = screenWidth >= SIDEBAR_CONSTANTS.MOBILE_BREAKPOINT && screenWidth < SIDEBAR_CONSTANTS.TABLET_BREAKPOINT
        
        // モバイル・タブレットでは異なる中心計算
        let contentCenterX: number
        let contentCenterY: number
        
        if (isMobile || isTablet) {
          // モバイル・タブレット: 画面全体の中心を使用
          contentCenterX = screenWidth / 2
          contentCenterY = screenHeight / 2
        } else {
          // デスクトップ: サイドバーを考慮した中心
          const leftWidth = isLeftSidebarCollapsed 
            ? SIDEBAR_CONSTANTS.LEFT_SIDEBAR_COLLAPSED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
            : SIDEBAR_CONSTANTS.LEFT_SIDEBAR_EXPANDED + SIDEBAR_CONSTANTS.LEFT_SIDEBAR_MARGIN
          
          const rightWidth = isRightSidebarOpen 
            ? rightSidebarWidth + SIDEBAR_CONSTANTS.RIGHT_SIDEBAR_MARGIN
            : 0
          
          const availableWidth = screenWidth - leftWidth - rightWidth
          contentCenterX = leftWidth + (availableWidth / 2)
          contentCenterY = screenHeight / 2
        }
        
        // 統一されたセンタリング関数を使用
        const viewport = calculateCenteringViewport({
          nodePosition: position,
          contentCenterX,
          contentCenterY,
          zoom,
          isMobile,
          isTablet
        })
        
        setViewport({
          x: viewport.x,
          y: viewport.y,
          zoom: zoom
        }, { duration: 0 })
        
        log.debug('Initial centering on React Flow init (direct viewport)', {
          nodeId: rootNode.id,
          zoom: zoom,
          device: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
          viewportCalculation: {
            screenWidth,
            screenHeight,
            contentCenterX,
            contentCenterY,
            nodePosition: position,
            calculatedViewport: { x: viewport.x, y: viewport.y }
          }
        })
      }
    }
  }, [chatNodes, setViewport, isLeftSidebarCollapsed, isRightSidebarOpen, rightSidebarWidth, getActualNodePosition, calculateCenteringViewport])

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
        minZoom={shouldUseTouchOptimizations ? 0.5 : 0.1}
        maxZoom={shouldUseTouchOptimizations ? 1.5 : 2}
        // Set a reasonable default to avoid the jump from top-left
        defaultViewport={{
          x: 900,  // Approximate center position
          y: 250,  // Approximate center position
          zoom: 0.8
        }}
        onPaneClick={onBackgroundClick}
        onInit={handleInit}
        {...touchOptimizations}
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
