/**
 * CompactTreeLayout - Efficient tree layout algorithm for minimal width presentation
 * Optimized for clean, compact visual arrangement
 */

export interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  subtreeWidth: number
}

export interface LayoutConfig {
  horizontalSpacing: number
  verticalSpacing: number
  nodeWidth: number
  minSubtreeSpacing: number
}

export interface TreeNode {
  id: string
  parentId: string | null
  depth: number
  children: TreeNode[]
}

export class CompactTreeLayout {
  private config: LayoutConfig
  private positions: Map<string, NodePosition> = new Map()
  private subtreeWidths: Map<string, number> = new Map()

  constructor(config: LayoutConfig) {
    this.config = config
  }

  /**
   * Calculate positions for all nodes in the tree
   */
  calculateLayout(nodes: TreeNode[]): Map<string, NodePosition> {
    this.positions.clear()
    this.subtreeWidths.clear()

    if (nodes.length === 0) return this.positions

    // Build tree structure
    const nodeMap = new Map<string, TreeNode>()
    const rootNodes: TreeNode[] = []

    nodes.forEach(node => {
      nodeMap.set(node.id, node)
      if (!node.parentId) {
        rootNodes.push(node)
      }
    })

    // Build parent-child relationships
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId)
        if (parent) {
          parent.children.push(node)
        }
      }
    })

    // Sort children by creation order (assuming ID contains timestamp info)
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => a.id.localeCompare(b.id))
      node.children.forEach(sortChildren)
    }
    rootNodes.forEach(sortChildren)

    // Calculate subtree widths first (bottom-up) - Compact mode only
    const calculateSubtreeWidths = (node: TreeNode): number => {
      if (node.children.length === 0) {
        const width = this.config.nodeWidth
        this.subtreeWidths.set(node.id, width)
        return width
      }

      // Calculate children subtree widths
      const childWidths = node.children.map(calculateSubtreeWidths)
      
      // Compact mode: minimum spacing for efficient layout
      const subtreeWidth = Math.max(
        this.config.nodeWidth,
        childWidths.reduce((sum, width) => sum + width, 0) + 
        (node.children.length - 1) * this.config.horizontalSpacing
      )

      this.subtreeWidths.set(node.id, subtreeWidth)
      return subtreeWidth
    }

    rootNodes.forEach(calculateSubtreeWidths)

    // Position nodes (top-down)
    this.positionRootNodes(rootNodes)
    rootNodes.forEach(root => this.positionSubtree(root))

    return this.positions
  }



  /**
   * Position root nodes with symmetric distribution
   */
  private positionRootNodes(rootNodes: TreeNode[]): void {
    if (rootNodes.length === 0) return

    if (rootNodes.length === 1) {
      // Single root: center at origin
      const root = rootNodes[0]
      const subtreeWidth = this.subtreeWidths.get(root.id) || this.config.nodeWidth
      
      this.positions.set(root.id, {
        id: root.id,
        x: 0,
        y: 0,
        width: this.config.nodeWidth,
        subtreeWidth
      })
      return
    }

    // Multiple roots: distribute symmetrically
    const rootWidths = rootNodes.map(node => this.subtreeWidths.get(node.id) || this.config.nodeWidth)
    const positions = this.calculateChildPositions(0, rootWidths, this.config.minSubtreeSpacing)

    rootNodes.forEach((node, index) => {
      this.positions.set(node.id, {
        id: node.id,
        x: positions[index],
        y: 0,
        width: this.config.nodeWidth,
        subtreeWidth: rootWidths[index]
      })
    })
  }

  /**
   * Position a subtree recursively
   */
  private positionSubtree(node: TreeNode): void {
    const nodePos = this.positions.get(node.id)
    if (!nodePos || node.children.length === 0) return

    const childWidths = node.children.map(child => this.subtreeWidths.get(child.id) || this.config.nodeWidth)
    
    if (node.children.length === 1) {
      // Single child: center under parent
      const child = node.children[0]
      const childWidth = childWidths[0]
      
      this.positions.set(child.id, {
        id: child.id,
        x: nodePos.x, // Center under parent
        y: nodePos.y + this.config.verticalSpacing,
        width: this.config.nodeWidth,
        subtreeWidth: childWidth
      })
    } else {
      // Multiple children: distribute based on their subtree widths
      const childPositions = this.calculateChildPositions(
        nodePos.x, 
        childWidths, 
        this.config.horizontalSpacing
      )

      node.children.forEach((child, index) => {
        this.positions.set(child.id, {
          id: child.id,
          x: childPositions[index],
          y: nodePos.y + this.config.verticalSpacing,
          width: this.config.nodeWidth,
          subtreeWidth: childWidths[index]
        })
      })
    }

    // Recursively position children
    node.children.forEach(child => this.positionSubtree(child))
  }

  /**
   * Calculate optimal positions for children using compact layout
   * Minimizes total width while maintaining readability
   */
  calculateChildPositions(parentX: number, childWidths: number[], minSpacing: number): number[] {
    if (childWidths.length === 0) return []
    if (childWidths.length === 1) return [parentX]

    return this.calculateCompactPositions(parentX, childWidths, minSpacing)
  }

  /**
   * Compact positioning: minimize total width
   */
  private calculateCompactPositions(parentX: number, childWidths: number[], minSpacing: number): number[] {
    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) + (childWidths.length - 1) * minSpacing
    const startX = parentX - totalWidth / 2

    const positions: number[] = []
    let currentX = startX

    childWidths.forEach(width => {
      positions.push(currentX + width / 2)
      currentX += width + minSpacing
    })

    return positions
  }



  /**
   * Get the total width of a subtree
   */
  getSubtreeWidth(nodeId: string): number {
    return this.subtreeWidths.get(nodeId) || this.config.nodeWidth
  }

  /**
   * Get current layout configuration
   */
  getConfig(): LayoutConfig {
    return { ...this.config }
  }
}
