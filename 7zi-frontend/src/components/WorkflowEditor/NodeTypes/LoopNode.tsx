/**
 * LoopNode - 循环节点
 *
 * v1.9.1 新增
 * 支持计数循环、条件循环、集合循环
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function LoopNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.loop

  const loopTypeLabel = {
    count: '计数循环',
    condition: '条件循环',
    collection: '集合循环',
  }

  return (
    <div
      className={`workflow-node relative min-w-[220px] rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
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
        className="!border-2 !bg-pink-500 dark:!border-pink-400"
      />

      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-pink-500 dark:!border-pink-400"
      />

      {/* 循环体输出句柄 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="body"
        className="!border-2 !bg-purple-500 dark:!border-purple-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔄</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Loop'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {loopTypeLabel[data.config.loopType as keyof typeof loopTypeLabel] || '循环'}
          </div>
        </div>
      </div>

      {/* 循环配置显示 */}
      {data.config.loopType === 'count' && data.config.loopCount && (
        <div className="mt-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          重复 {data.config.loopCount} 次
        </div>
      )}

      {data.config.loopType === 'condition' && data.config.loopCondition && (
        <div className="mt-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {data.config.loopCondition}
        </div>
      )}

      {data.config.loopType === 'collection' && data.config.collectionPath && (
        <div className="mt-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {data.config.collectionPath}
        </div>
      )}

      {/* 迭代变量 */}
      {data.config.iterationVariable && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          变量: {data.config.iterationVariable}
        </div>
      )}

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