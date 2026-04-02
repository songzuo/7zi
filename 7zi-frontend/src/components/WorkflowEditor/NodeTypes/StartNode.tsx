/**
 * StartNode - 开始节点
 *
 * 工作流入口节点
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function StartNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.start

  return (
    <div
      className={`workflow-node relative rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
        selected ? 'border-indigo-500 shadow-md' : 'border-green-500'
      }`}
      style={{
        borderColor: selected ? '#6366F1' : colors.light,
        backgroundColor: selected ? undefined : colors.bg,
      }}
    >
      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-green-500 dark:!border-green-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">▶️</span>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{data.label || 'Start'}</div>
          {data.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400">{data.description}</div>
          )}
        </div>
      </div>

      {/* 执行状态指示器 */}
      {data.executionStatus && (
        <div
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            backgroundColor:
              data.executionStatus === 'SUCCESS'
                ? '#10B981'
                : data.executionStatus === 'FAILED'
                  ? '#EF4444'
                  : '#3B82F6',
          }}
        >
          {data.executionStatus === 'SUCCESS'
            ? '✓'
            : data.executionStatus === 'FAILED'
              ? '✗'
              : '⏳'}
        </div>
      )}
    </div>
  )
}
