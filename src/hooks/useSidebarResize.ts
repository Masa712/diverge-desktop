import { useState, useCallback, useRef, useEffect } from 'react'

interface UseSidebarResizeProps {
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onWidthChange?: (width: number) => void
}

export function useSidebarResize({ 
  initialWidth = 400, 
  minWidth = 400,
  maxWidth = 800,
  onWidthChange 
}: UseSidebarResizeProps = {}) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return
      
      const rect = sidebarRef.current.getBoundingClientRect()
      const newWidth = Math.min(maxWidth, Math.max(minWidth, rect.right - e.clientX))
      setWidth(newWidth)
      onWidthChange?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, minWidth, maxWidth, onWidthChange])

  return {
    width,
    isResizing,
    sidebarRef,
    handleMouseDown
  }
}