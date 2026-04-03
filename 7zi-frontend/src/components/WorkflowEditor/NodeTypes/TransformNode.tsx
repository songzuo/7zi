/**
 * TransformNode - 数据转换节点
 *
 * v1.9.1 新增
 * 支持数据转换、处理和格式化
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function TransformNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.transform

  const outputFormatLabel = {
    json: 'JSON',
    xml: 'XML',
    csv: 'CSV',
    text: 'Text',
  }

  return (
    <div
      className={`workflow-node relative min-w-[200px] rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
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
        className="!border-2 !bg-lime-500 dark:!border-lime-400"
      />

      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-lime-500 dark:!border-lime-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔄</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Transform'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">数据转换</div>
        </div>
      </div>

      {/* 转换表达式 */}
      {data.config.transformExpression && (
        <div className="mt-2 max-h-16 overflow-hidden rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {data.config.transformExpression}
        </div>
      )}

      {/* 输出格式 */}
      {data.config.outputFormat && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">输出格式:</span>
          <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium dark:bg-gray-600">
            {outputFormatLabel[data.config.outputFormat as keyof typeof outputFormatLabel] || 'JSON'}
          </span>
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