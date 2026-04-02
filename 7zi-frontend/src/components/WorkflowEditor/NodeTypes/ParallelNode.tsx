/**
 * ParallelNode - 并行节点
 *
 * 并行执行节点
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function ParallelNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.parallel

  return (
    <div
      className={`workflow-node relative min-w-[180px] rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
        selected ? 'border-indigo-500 shadow-md' : ''
      }`}
      style={{
        borderColor: selected ? '#6366F1' : colors.light,
        backgroundColor: selected ? undefined : colors.bg,
      }}
    >
      {/* 输入句柄 */}
      <Handle
        type="target"
        position={Position.Left}
        className="!border-2 !bg-violet-500 dark:!border-violet-400"
      />

      {/* 输出句柄 1 */}
      <Handle
        type="source"
        position={Position.Right}
        id="branch-1"
        className="!border-2 !bg-violet-500 dark:!border-violet-400"
      />

      {/* 输出句柄 2 */}
      <Handle
        type="source"
        position={Position.Top}
        id="branch-2"
        className="!border-2 !bg-violet-500 dark:!border-violet-400"
      />

      {/* 输出句柄 3 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="branch-3"
        className="!border-2 !bg-violet-500 dark:!border-violet-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">⚡</span>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Parallel'}
          </div>
          {data.config.maxConcurrency && (
            <div className="text-xs text-violet-600 dark:text-violet-400">
              Max {data.config.maxConcurrency} concurrent
            </div>
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
