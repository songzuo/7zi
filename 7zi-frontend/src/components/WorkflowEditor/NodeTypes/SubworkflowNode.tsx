/**
 * SubworkflowNode - 子工作流节点
 *
 * v1.9.1 新增
 * 用于调用和执行子工作流
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function SubworkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.subworkflow

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
        className="!border-2 !bg-teal-500 dark:!border-teal-400"
      />

      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-teal-500 dark:!border-teal-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">📦</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Subworkflow'}
          </div>
          {data.config.subworkflowId ? (
            <div className="mt-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              ID: {data.config.subworkflowId}
            </div>
          ) : (
            <div className="mt-1 text-xs text-red-500 dark:text-red-400">⚠️ 未配置子工作流</div>
          )}
        </div>
      </div>

      {/* 输入参数 */}
      {data.config.subworkflowInputs && Object.keys(data.config.subworkflowInputs).length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400">输入参数:</div>
          <div className="space-y-0.5">
            {Object.entries(data.config.subworkflowInputs).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700"
              >
                <span className="font-mono text-gray-600 dark:text-gray-400">{key}:</span>
                <span className="text-gray-900 dark:text-white">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
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