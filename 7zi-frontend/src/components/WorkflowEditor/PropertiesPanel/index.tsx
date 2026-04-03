/**
 * PropertiesPanel - 属性编辑面板
 *
 * 节点和工作流属性编辑器
 * v1.10.0 更新: 支持边属性编辑
 * v1.11.0 更新: 新增验证状态、快捷操作支持
 */

import React from 'react'
import { NodeProperties } from './NodeProperties'
import { EdgeProperties } from './EdgeProperties'
import type { WorkflowNodeData, WorkflowEdgeData, ValidationError } from '../types'
import type { Node, Edge } from 'reactflow'

interface PropertiesPanelProps {
  node?: Node<WorkflowNodeData> | null
  edge?: Edge<WorkflowEdgeData> | null
  onNodeChange?: (data: Partial<WorkflowNodeData>) => void
  onEdgeChange?: (data: Partial<WorkflowEdgeData>) => void
  onDeleteNode?: () => void
  onDuplicateNode?: () => void
  validationErrors?: ValidationError[]
}

export function PropertiesPanel({ 
  node, 
  edge, 
  onNodeChange, 
  onEdgeChange,
  onDeleteNode,
  onDuplicateNode,
  validationErrors = []
}: PropertiesPanelProps) {
  if (edge) {
    return <EdgeProperties edge={edge} onChange={onEdgeChange} />
  }

  if (node) {
    return (
      <NodeProperties 
        node={node} 
        onChange={onNodeChange}
        onDelete={onDeleteNode}
        onDuplicate={onDuplicateNode}
        validationErrors={validationErrors}
      />
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-gray-500 dark:text-gray-400">
      <div className="mb-4 text-6xl">🖱️</div>
      <p className="text-lg font-medium">选择节点或连接线</p>
      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
        点击画布上的节点或连接线以编辑属性
      </p>
      <div className="mt-6 space-y-2 text-left text-sm">
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono dark:bg-gray-700">点击</span>
          <span>选择节点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono dark:bg-gray-700">拖拽</span>
          <span>移动节点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono dark:bg-gray-700">Ctrl+D</span>
          <span>复制节点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-mono dark:bg-gray-700">Delete</span>
          <span>删除节点</span>
        </div>
      </div>
    </div>
  )
}

export { NodeProperties } from './NodeProperties'
export { EdgeProperties } from './EdgeProperties'