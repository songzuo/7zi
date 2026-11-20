'use client'

/**
 * WorkflowCanvas.tsx
 * 工作流画布组件 - 可视化设计器
 *
 * 功能:
 * - 节点拖拽放置
 * - 边/连接线绘制
 * - 状态管理
 * - 纯CSS样式（无外部UI库）
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'

// 类型定义
export type WorkflowNodeType = 'task' | 'condition' | 'parallel' | 'merge' | 'start' | 'end'

export type NodeState = 'pending' | 'running' | 'completed' | 'failed'

export interface WorkflowNodeData {
  id: string
  type: WorkflowNodeType
  label: string
  description?: string
  position: { x: number; y: number }
  config?: Record<string, unknown>
  state?: NodeState
}

export interface WorkflowEdgeData {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNodeData[]
  edges: WorkflowEdgeData[]
}

/**
 * 画布状态
 */
interface CanvasState {
  zoom: number
  panX: number
  panY: number
  gridSize: number
  snapToGrid: boolean
}

/**
 * 拖拽信息
 */
interface DragInfo {
  isDragging: boolean
  nodeId: string | null
  offsetX: number
  offsetY: number
}

/**
 * 连接信息
 */
interface ConnectionInfo {
  isConnecting: boolean
  sourceId: string | null
  targetPosition: { x: number; y: number }
}

/**
 * 画布属性
 */
export interface WorkflowCanvasProps {
  nodes: WorkflowNodeData[]
  edges: WorkflowEdgeData[]
  selectedNodeId?: string
  onNodeSelect?: (nodeId: string | undefined) => void
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
  onNodeAdd?: (type: WorkflowNodeType, position: { x: number; y: number }) => void
  onNodeDelete?: (nodeId: string) => void
  onEdgeAdd?: (sourceId: string, targetId: string) => void
  onEdgeDelete?: (edgeId: string) => void
  readOnly?: boolean
  className?: string
  width?: number | string
  height?: number | string
}

/**
 * 画布方法
 */
export interface WorkflowCanvasRef {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  fitToContent: () => void
  exportToSVG: () => string
  getSelectedNodes: () => string[]
}

// 节点默认尺寸
const NODE_WIDTH = 180
const NODE_HEIGHT = 80

// 节点颜色配置
const NODE_COLORS: Record<WorkflowNodeType, { bg: string; border: string; text: string }> = {
  start: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  end: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  task: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
  condition: { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  parallel: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8' },
  merge: { bg: '#e0e7ff', border: '#4f46e5', text: '#3730a3' },
}

// 状态颜色
const STATE_COLORS: Record<NodeState, string> = {
  pending: '#9ca3af',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
}

/**
 * 工作流画布组件
 */
export const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(
  (
    {
      nodes,
      edges,
      selectedNodeId,
      onNodeSelect,
      onNodeMove,
      onNodeAdd,
      onNodeDelete,
      onEdgeAdd,
      onEdgeDelete,
      readOnly = false,
      className = '',
      width = '100%',
      height = '100%',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // 画布状态
    const [canvasState, setCanvasState] = useState<CanvasState>({
      zoom: 1,
      panX: 0,
      panY: 0,
      gridSize: 20,
      snapToGrid: true,
    })

    // 拖拽状态
    const [dragInfo, setDragInfo] = useState<DragInfo>({
      isDragging: false,
      nodeId: null,
      offsetX: 0,
      offsetY: 0,
    })

    // 连接状态
    const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
      isConnecting: false,
      sourceId: null,
      targetPosition: { x: 0, y: 0 },
    })

    // 画布拖拽状态
    const [isPanning, setIsPanning] = useState(false)
    const [panStart, setPanStart] = useState({ x: 0, y: 0 })

    // 对齐到网格
    const snapToGrid = useCallback(
      (position: { x: number; y: number }) => {
        if (!canvasState.snapToGrid) return position
        const { gridSize } = canvasState
        return {
          x: Math.round(position.x / gridSize) * gridSize,
          y: Math.round(position.y / gridSize) * gridSize,
        }
      },
      [canvasState.snapToGrid, canvasState.gridSize]
    )

    // 获取鼠标在画布中的位置
    const getCanvasPosition = useCallback(
      (clientX: number, clientY: number) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }

        return {
          x: (clientX - rect.left - canvasState.panX) / canvasState.zoom,
          y: (clientY - rect.top - canvasState.panY) / canvasState.zoom,
        }
      },
      [canvasState]
    )

    // 缩放方法
    const zoomIn = useCallback(() => {
      setCanvasState(prev => ({
        ...prev,
        zoom: Math.min(prev.zoom * 1.2, 3),
      }))
    }, [])

    const zoomOut = useCallback(() => {
      setCanvasState(prev => ({
        ...prev,
        zoom: Math.max(prev.zoom / 1.2, 0.3),
      }))
    }, [])

    const resetView = useCallback(() => {
      setCanvasState(prev => ({
        ...prev,
        zoom: 1,
        panX: 0,
        panY: 0,
      }))
    }, [])

    const fitToContent = useCallback(() => {
      if (nodes.length === 0) return

      const padding = 50
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity

      nodes.forEach(node => {
        minX = Math.min(minX, node.position.x)
        minY = Math.min(minY, node.position.y)
        maxX = Math.max(maxX, node.position.x + NODE_WIDTH)
        maxY = Math.max(maxY, node.position.y + NODE_HEIGHT)
      })

      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const contentWidth = maxX - minX + padding * 2
      const contentHeight = maxY - minY + padding * 2

      const zoom = Math.min(
        containerRect.width / contentWidth,
        containerRect.height / contentHeight,
        1
      )

      const panX = (containerRect.width - contentWidth * zoom) / 2 - minX * zoom + padding
      const panY = (containerRect.height - contentHeight * zoom) / 2 - minY * zoom + padding

      setCanvasState(prev => ({
        ...prev,
        zoom,
        panX,
        panY,
      }))
    }, [nodes])

    // 导出SVG
    const exportToSVG = useCallback((): string => {
      if (!svgRef.current) return ''
      return new XMLSerializer().serializeToString(svgRef.current)
    }, [])

    const getSelectedNodes = useCallback((): string[] => {
      return selectedNodeId ? [selectedNodeId] : []
    }, [selectedNodeId])

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      resetView,
      fitToContent,
      exportToSVG,
      getSelectedNodes,
    }))

    // 画布鼠标事件
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        // 中键或 Alt+左键 拖动画布
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          e.preventDefault()
          setIsPanning(true)
          setPanStart({
            x: e.clientX - canvasState.panX,
            y: e.clientY - canvasState.panY,
          })
          return
        }

        // 左键点击空白区域
        if (e.button === 0 && e.target === svgRef.current) {
          onNodeSelect?.(undefined)
        }
      },
      [canvasState, onNodeSelect]
    )

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        // 更新连接线位置
        if (connectionInfo.isConnecting) {
          setConnectionInfo(prev => ({
            ...prev,
            targetPosition: getCanvasPosition(e.clientX, e.clientY),
          }))
        }

        // 画布拖拽
        if (isPanning) {
          setCanvasState(prev => ({
            ...prev,
            panX: e.clientX - panStart.x,
            panY: e.clientY - panStart.y,
          }))
          return
        }

        // 节点拖拽
        if (dragInfo.isDragging && dragInfo.nodeId) {
          const pos = getCanvasPosition(e.clientX, e.clientY)
          const newPosition = snapToGrid({
            x: pos.x - dragInfo.offsetX,
            y: pos.y - dragInfo.offsetY,
          })
          onNodeMove?.(dragInfo.nodeId, newPosition)
        }
      },
      [
        isPanning,
        panStart,
        dragInfo,
        connectionInfo.isConnecting,
        getCanvasPosition,
        snapToGrid,
        onNodeMove,
      ]
    )

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        // 完成连接
        if (connectionInfo.isConnecting && connectionInfo.sourceId) {
          const targetElement = (e.target as HTMLElement).closest('[data-node-id]')
          const targetId = targetElement?.getAttribute('data-node-id')
          if (targetId && targetId !== connectionInfo.sourceId) {
            onEdgeAdd?.(connectionInfo.sourceId, targetId)
          }
        }

        setIsPanning(false)
        setDragInfo({
          isDragging: false,
          nodeId: null,
          offsetX: 0,
          offsetY: 0,
        })
        setConnectionInfo({
          isConnecting: false,
          sourceId: null,
          targetPosition: { x: 0, y: 0 },
        })
      },
      [connectionInfo, onEdgeAdd]
    )

    // 滚轮缩放
    const handleWheel = useCallback((e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setCanvasState(prev => ({
          ...prev,
          zoom: Math.min(Math.max(prev.zoom * delta, 0.3), 3),
        }))
      }
    }, [])

    // 节点事件
    const handleNodeMouseDown = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        if (readOnly || e.button !== 0) return

        e.stopPropagation()
        onNodeSelect?.(nodeId)

        const node = nodes.find(n => n.id === nodeId)
        if (!node) return

        const pos = getCanvasPosition(e.clientX, e.clientY)
        setDragInfo({
          isDragging: true,
          nodeId,
          offsetX: pos.x - node.position.x,
          offsetY: pos.y - node.position.y,
        })
      },
      [readOnly, nodes, getCanvasPosition, onNodeSelect]
    )

    // 连接点事件
    const handleConnectorMouseDown = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        if (readOnly || e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()

        const pos = getCanvasPosition(e.clientX, e.clientY)
        setConnectionInfo({
          isConnecting: true,
          sourceId: nodeId,
          targetPosition: pos,
        })
      },
      [readOnly, getCanvasPosition]
    )

    // 键盘事件
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (readOnly || !selectedNodeId) return

        if (e.key === 'Delete' || e.key === 'Backspace') {
          onNodeDelete?.(selectedNodeId)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [readOnly, selectedNodeId, onNodeDelete])

    // 绘制网格
    const renderGrid = useMemo(() => {
      const { zoom, panX, panY, gridSize } = canvasState
      const scaledGridSize = gridSize * zoom

      return (
        <defs>
          <pattern
            id="workflow-grid"
            width={scaledGridSize}
            height={scaledGridSize}
            patternUnits="userSpaceOnUse"
            x={panX % scaledGridSize}
            y={panY % scaledGridSize}
          >
            <path
              d={`M ${scaledGridSize} 0 L 0 0 0 ${scaledGridSize}`}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
          </pattern>
        </defs>
      )
    }, [canvasState])

    // 绘制边
    const renderEdges = useMemo(() => {
      return edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source)
        const targetNode = nodes.find(n => n.id === edge.target)
        if (!sourceNode || !targetNode) return null

        const startX = sourceNode.position.x + NODE_WIDTH
        const startY = sourceNode.position.y + NODE_HEIGHT / 2
        const endX = targetNode.position.x
        const endY = targetNode.position.y + NODE_HEIGHT / 2

        // 计算控制点（贝塞尔曲线）
        const controlPointOffset = Math.abs(endX - startX) / 2
        const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`

        return (
          <g key={edge.id} className="workflow-edge">
            <path
              d={path}
              fill="none"
              stroke="#9ca3af"
              strokeWidth={2}
              className="edge-path"
              style={{ cursor: 'pointer' }}
              onClick={() => onEdgeDelete?.(edge.id)}
            />
            {edge.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 10}
                fontSize={12}
                fill="#6b7280"
                textAnchor="middle"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })
    }, [edges, nodes, onEdgeDelete])

    // 绘制正在创建的连接线
    const renderConnectingLine = useMemo(() => {
      if (!connectionInfo.isConnecting || !connectionInfo.sourceId) return null

      const sourceNode = nodes.find(n => n.id === connectionInfo.sourceId)
      if (!sourceNode) return null

      const startX = sourceNode.position.x + NODE_WIDTH
      const startY = sourceNode.position.y + NODE_HEIGHT / 2
      const endX = connectionInfo.targetPosition.x
      const endY = connectionInfo.targetPosition.y

      return (
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      )
    }, [connectionInfo, nodes])

    // 绘制节点
    const renderNodes = useMemo(() => {
      return nodes.map(node => {
        const colors = NODE_COLORS[node.type]
        const isSelected = selectedNodeId === node.id
        const nodeState = node.state || 'pending'

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            transform={`translate(${node.position.x}, ${node.position.y})`}
            style={{ cursor: readOnly ? 'default' : 'move' }}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}
          >
            {/* 节点背景 */}
            <rect
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={8}
              ry={8}
              fill={colors.bg}
              stroke={isSelected ? '#3b82f6' : colors.border}
              strokeWidth={isSelected ? 3 : 2}
              style={{
                filter: isSelected ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : 'none',
              }}
            />

            {/* 状态指示器 */}
            <circle cx={10} cy={10} r={5} fill={STATE_COLORS[nodeState]} />

            {/* 节点标签 */}
            <text
              x={NODE_WIDTH / 2}
              y={NODE_HEIGHT / 2 - 5}
              fontSize={14}
              fontWeight={600}
              fill={colors.text}
              textAnchor="middle"
            >
              {node.label}
            </text>

            {/* 节点类型 */}
            <text
              x={NODE_WIDTH / 2}
              y={NODE_HEIGHT / 2 + 15}
              fontSize={10}
              fill="#6b7280"
              textAnchor="middle"
            >
              {node.type}
            </text>

            {/* 连接点（输出） */}
            {!readOnly && (
              <circle
                cx={NODE_WIDTH}
                cy={NODE_HEIGHT / 2}
                r={6}
                fill="white"
                stroke="#9ca3af"
                strokeWidth={2}
                style={{ cursor: 'crosshair' }}
                onMouseDown={e => handleConnectorMouseDown(e, node.id)}
              />
            )}
          </g>
        )
      })
    }, [nodes, selectedNodeId, readOnly, handleNodeMouseDown, handleConnectorMouseDown])

    // 样式
    const containerStyle: React.CSSProperties = {
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      cursor: isPanning ? 'grabbing' : 'grab',
    }

    const svgStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`,
      transformOrigin: '0 0',
    }

    const toolbarStyle: React.CSSProperties = {
      position: 'absolute',
      top: 10,
      right: 10,
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      backgroundColor: 'white',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      zIndex: 10,
    }

    const buttonStyle: React.CSSProperties = {
      padding: '6px 12px',
      fontSize: 12,
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      backgroundColor: 'white',
      cursor: 'pointer',
      transition: 'all 0.15s',
    }

    const zoomIndicatorStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: 10,
      right: 10,
      padding: '4px 8px',
      backgroundColor: 'white',
      borderRadius: 4,
      fontSize: 12,
      color: '#6b7280',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }

    return (
      <div
        ref={containerRef}
        className={`workflow-canvas ${className}`}
        style={containerStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* 工具栏 */}
        <div style={toolbarStyle}>
          <button style={buttonStyle} onClick={zoomIn} title="放大">
            🔍+
          </button>
          <button style={buttonStyle} onClick={zoomOut} title="缩小">
            🔍-
          </button>
          <button style={buttonStyle} onClick={fitToContent} title="适应内容">
            ⛶
          </button>
          <button style={buttonStyle} onClick={resetView} title="重置视图">
            ↺
          </button>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: canvasState.snapToGrid ? '#dbeafe' : 'white',
            }}
            onClick={() => setCanvasState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }))}
            title={canvasState.snapToGrid ? '关闭网格对齐' : '开启网格对齐'}
          >
            ⊞
          </button>
        </div>

        {/* SVG 画布 */}
        <svg ref={svgRef} style={svgStyle}>
          {/* 网格背景 */}
          {renderGrid}
          <rect x={0} y={0} width="100%" height="100%" fill="url(#workflow-grid)" />

          {/* 边 */}
          <g className="edges-layer">
            {renderEdges}
            {renderConnectingLine}
          </g>

          {/* 节点 */}
          <g className="nodes-layer">{renderNodes}</g>
        </svg>

        {/* 缩放指示器 */}
        <div style={zoomIndicatorStyle}>{Math.round(canvasState.zoom * 100)}%</div>
      </div>
    )
  }
)

WorkflowCanvas.displayName = 'WorkflowCanvas'

export default WorkflowCanvas
