/**
 * 工作流设计器组件导出
 */

import { NodeType, EdgeType } from '@/types/workflow'
import { WorkflowCanvas } from './canvas'
export { WorkflowCanvas } from './canvas'
export type { WorkflowCanvasRef } from './canvas'
export { WorkflowNodeComponent, NodeTypeSelector } from './node'
export { WorkflowEdgeComponent, EdgeTypeSelector } from './edge'
import { DesignerToolbar, NodeToolbar, PropertyPanel } from './toolbar'
export { DesignerToolbar, NodeToolbar, PropertyPanel } from './toolbar'

/**
 * 工作流设计器属性
 */
export interface WorkflowDesignerProps {
  workflowId?: string
  nodes: Array<{
    id: string
    name: string
    type: NodeType
    position: { x: number; y: number }
    data?: Record<string, unknown>
    config?: Record<string, unknown>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type: EdgeType
    data?: Record<string, unknown>
  }>
  selectedNodeId?: string
  onNodeSelect?: (nodeId: string | undefined) => void
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
  onNodeAdd?: (type: string, position: { x: number; y: number }) => void
  onNodeDelete?: (nodeId: string) => void
  onEdgeAdd?: (sourceId: string, targetId: string) => void
  onEdgeDelete?: (edgeId: string) => void
  onNodeUpdate?: (nodeId: string, updates: Record<string, unknown>) => void
  readOnly?: boolean
  showToolbar?: boolean
  showPropertyPanel?: boolean
}

/**
 * 工作流设计器主组件
 * 整合画布、工具栏和属性面板
 */
export function WorkflowDesigner({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeAdd,
  onNodeDelete,
  onEdgeAdd,
  onEdgeDelete,
  onNodeUpdate,
  readOnly = false,
  showToolbar = true,
  showPropertyPanel = true,
}: WorkflowDesignerProps) {
  // 计算选中的节点
  const selectedNode = nodes.find(n => n.id === selectedNodeId)

  return (
    <div className="relative flex h-full w-full">
      {/* 左侧工具栏 */}
      {showToolbar && !readOnly && (
        <div className="absolute top-4 left-4 z-20">
          <NodeToolbar
            onNodeAdd={type => {
              // 在画布中心添加节点
              const centerX = 400
              const centerY = 300
              onNodeAdd?.(type, { x: centerX, y: centerY })
            }}
          />
        </div>
      )}

      {/* 画布区域 */}
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        onNodeSelect={onNodeSelect}
        onNodeMove={onNodeMove}
        onNodeDelete={onNodeDelete}
        onEdgeAdd={onEdgeAdd}
        onEdgeDelete={onEdgeDelete}
        readOnly={readOnly}
        className="flex-1"
      />

      {/* 右侧属性面板 */}
      {showPropertyPanel && !readOnly && (
        <div className="absolute top-4 right-4 z-20 w-80">
          <PropertyPanel selectedNode={selectedNode} onNodeUpdate={onNodeUpdate} />
        </div>
      )}
    </div>
  )
}
