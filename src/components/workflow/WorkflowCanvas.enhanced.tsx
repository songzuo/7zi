'use client'

/**
 * WorkflowCanvas.tsx (Enhanced)
 * 增强版工作流画布组件 - 支持拖拽、右键菜单、增强连接线
 *
 * 功能:
 * - 从节点面板拖拽节点到画布
 * - 节点拖拽移动（网格对齐）
 * - 画布平移（右键拖拽或空格+左键拖拽）
 * - 右键节点显示上下文菜单
 * - 增强连接线（条件节点支持 YES/NO 分支）
 * - 连接点悬停放大高亮
 * - 双击节点打开配置
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
import { cn } from '@/lib/utils'
import { WorkflowNode, WorkflowEdge, NodeType, EdgeType } from '@/types/workflow'

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
  sourcePort?: 'yes' | 'no' | 'default' // 条件节点的端口
  targetPosition: { x: number; y: number }
}

/**
 * 画布属性
 */
export interface WorkflowCanvasProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId?: string
  onNodeSelect?: (nodeId: string | undefined) => void
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
  onNodeAdd?: (type: NodeType, position: { x: number; y: number }) => void
  onNodeDelete?: (nodeId: string) => void
  onNodeCopy?: (nodeId: string) => void
  onNodeSetStart?: (nodeId: string) => void
  onNodeDoubleClick?: (nodeId: string) => void
  onEdgeAdd?: (sourceId: string, targetId: string, edgeType?: EdgeType, condition?: string) => void
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
const NODE_COLORS: Record<NodeType, { bg: string; border: string; text: string }> = {
  [NodeType.START]: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  [NodeType.END]: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  [NodeType.AGENT]: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
  [NodeType.CONDITION]: { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  [NodeType.PARALLEL]: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8' },
  [NodeType.WAIT]: { bg: '#e0e7ff', border: '#4f46e5', text: '#3730a3' },
  [NodeType.HUMAN_INPUT]: { bg: '#fce7f3', border: '#db2777', text: '#9d174d' },
  [NodeType.LOOP]: { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  [NodeType.SUBWORKFLOW]: { bg: '#cffafe', border: '#0891b2', text: '#155e75' },
}

// 连接线颜色
const EDGE_COLORS: Record<EdgeType, string> = {
  [EdgeType.SEQUENCE]: '#9ca3af',
  [EdgeType.CONDITION]: '#f59e0b',
  [EdgeType.PARALLEL]: '#8b5cf6',
  [EdgeType.DEFAULT]: '#9ca3af',
}

/**
 * 增强版工作流画布组件
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
      onNodeCopy,
      onNodeSetStart,
      onNodeDoubleClick,
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
    const [isSpacePressed, setIsSpacePressed] = useState(false)

    // 悬停的连接点
    const [hoveredConnector, setHoveredConnector] = useState<{
      nodeId: string
      port?: 'yes' | 'no' | 'default'
    } | null>(null)

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

    // 处理从节点面板拖拽
    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()

        const nodeType = e.dataTransfer.getData('application/workflow-node-type')
        if (!nodeType || !onNodeAdd) return

        const pos = getCanvasPosition(e.clientX, e.clientY)
        const snappedPos = snapToGrid({
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        })

        onNodeAdd(nodeType as NodeType, snappedPos)
      },
      [getCanvasPosition, snapToGrid, onNodeAdd]
    )

    // 画布鼠标事件
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        // 右键拖拽或空格+左键拖拽平移画布
        if (e.button === 2 || (e.button === 0 && isSpacePressed)) {
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
      [canvasState, isSpacePressed, onNodeSelect]
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
            // 根据端口类型确定边类型
            let edgeType = EdgeType.SEQUENCE
            let condition = undefined

            if (connectionInfo.sourcePort === 'yes') {
              edgeType = EdgeType.CONDITION
              condition = 'true'
            } else if (connectionInfo.sourcePort === 'no') {
              edgeType = EdgeType.CONDITION
              condition = 'false'
            }

            onEdgeAdd?.(connectionInfo.sourceId, targetId, edgeType, condition)
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

    // 键盘事件
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          setIsSpacePressed(true)
        }

        if (readOnly || !selectedNodeId) return

        if (e.key === 'Delete' || e.key === 'Backspace') {
          onNodeDelete?.(selectedNodeId)
        }
      }

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          setIsSpacePressed(false)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    }, [readOnly, selectedNodeId, onNodeDelete])

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

    const handleNodeDoubleClick = useCallback(
      (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation()
        onNodeDoubleClick?.(nodeId)
      },
      [onNodeDoubleClick]
    )

    // 连接点事件
    const handleConnectorMouseDown = useCallback(
      (e: React.MouseEvent, nodeId: string, port?: 'yes' | 'no' | 'default') => {
        if (readOnly || e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()

        const pos = getCanvasPosition(e.clientX, e.clientY)
        setConnectionInfo({
          isConnecting: true,
          sourceId: nodeId,
          sourcePort: port,
          targetPosition: pos,
        })
      },
      [readOnly, getCanvasPosition]
    )

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

        const edgeColor = EDGE_COLORS[edge.type] || EDGE_COLORS[EdgeType.SEQUENCE]

        return (
          <g key={edge.id} className="workflow-edge">
            <path
              d={path}
              fill="none"
              stroke={edgeColor}
              strokeWidth={2}
              className="edge-path"
              style={{ cursor: 'pointer' }}
              onClick={() => onEdgeDelete?.(edge.id)}
            />
            {edge.conditionConfig?.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 10}
                fontSize={12}
                fill={edgeColor}
                textAnchor="middle"
                fontWeight={600}
              >
                {edge.conditionConfig.label}
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

      const lineColor = connectionInfo.sourcePort === 'yes' 
        ? '#22c55e' 
        : connectionInfo.sourcePort === 'no' 
        ? '#ef4444' 
        : '#3b82f6'

      return (
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={lineColor}
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
        const isHovered = hoveredConnector?.nodeId === node.id

        return (
          <g
            key={node.id}
            data-node-id={node.id}
            transform={`translate(${node.position.x}, ${node.position.y})`}
            style={{ cursor: readOnly ? 'default' : 'move' }}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}
            onDoubleClick={e => handleNodeDoubleClick(e, node.id)}
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

            {/* 节点标签 */}
            <text
              x={NODE_WIDTH / 2}
              y={NODE_HEIGHT / 2 - 5}
              fontSize={14}
              fontWeight={600}
              fill={colors.text}
              textAnchor="middle"
            >
              {node.name}
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

            {/* 条件节点的 YES/NO 连接点 */}
            {!readOnly && node.type === NodeType.CONDITION && (
              <>
                {/* YES 连接点 */}
                <circle
                  cx={NODE_WIDTH}
                  cy={NODE_HEIGHT / 3}
                  r={isHovered && hoveredConnector?.port === 'yes' ? 8 : 6}
                  fill="white"
                  stroke="#22c55e"
                  strokeWidth={2}
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredConnector({ nodeId: node.id, port: 'yes' })}
                  onMouseLeave={() => setHoveredConnector(null)}
                  onMouseDown={e => handleConnectorMouseDown(e, node.id, 'yes')}
                />
                <text
                  x={NODE_WIDTH + 12}
                  y={NODE_HEIGHT / 3 + 4}
                  fontSize={10}
                  fill="#22c55e"
                  fontWeight={600}
                >
                  YES
                </text>

                {/* NO 连接点 */}
                <circle
                  cx={NODE_WIDTH}
                  cy={(NODE_HEIGHT / 3) * 2}
                  r={isHovered && hoveredConnector?.port === 'no' ? 8 : 6}
                  fill="white"
                  stroke="#ef4444"
                  strokeWidth={2}
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredConnector({ nodeId: node.id, port: 'no' })}
                  onMouseLeave={() => setHoveredConnector(null)}
                  onMouseDown={e => handleConnectorMouseDown(e, node.id, 'no')}
                />
                <text
                  x={NODE_WIDTH + 12}
                  y={(NODE_HEIGHT / 3) * 2 + 4}
                  fontSize={10}
                  fill="#ef4444"
                  fontWeight={600}
                >
                  NO
                </text>
              </>
            )}

            {/* 默认连接点（非条件节点） */}
            {!readOnly && node.type !== NodeType.CONDITION && (
              <circle
                cx={NODE_WIDTH}
                cy={NODE_HEIGHT / 2}
                r={isHovered && hoveredConnector?.port === 'default' ? 8 : 6}
                fill="white"
                stroke="#9ca3af"
                strokeWidth={2}
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredConnector({ nodeId: node.id, port: 'default' })}
                onMouseLeave={() => setHoveredConnector(null)}
                onMouseDown={e => handleConnectorMouseDown(e, node.id, 'default')}
              />
            )}

            {/* 选中状态的操作按钮 */}
            {isSelected && !readOnly && (
              <>
                {/* 删除按钮 */}
                <g
                  transform={`translate(${NODE_WIDTH - 20}, 5)`}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    onNodeDelete?.(node.id)
                  }}
                >
                  <circle r={10} fill="#ef4444" />
                  <text x={0} y={4} fontSize={12} fill="white" textAnchor="middle" fontWeight="bold">
                    ×
                  </text>
                </g>

                {/* 复制按钮 */}
                <g
                  transform={`translate(${NODE_WIDTH - 40}, 5)`}
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    e.stopPropagation()
                    onNodeCopy?.(node.id)
                  }}
                >
                  <circle r={10} fill="#3b82f6" />
                  <text x={0} y={4} fontSize={12} fill="white" textAnchor="middle" fontWeight="bold">
                    +
                  </text>
                </g>
              </>
            )}
          </g>
        )
      })
    }, [
      nodes,
      selectedNodeId,
      readOnly,
      hoveredConnector,
      handleNodeMouseDown,
      handleNodeDoubleClick,
      handleConnectorMouseDown,
      onNodeDelete,
      onNodeCopy,
    ])

    // 样式
    const containerStyle: React.CSSProperties = {
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default',
    }

    const svgStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      transform: `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`,
      transformOrigin: '0 0',
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
        className={cn('workflow-canvas', className)}
        style={containerStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()} // 禁用默认右键菜单
      >
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