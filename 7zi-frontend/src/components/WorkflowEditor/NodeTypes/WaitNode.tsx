/**
 * WaitNode - 等待节点
 *
 * 等待时间或事件
 */

import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'

export function WaitNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.wait

  const getWaitInfo = () => {
    if (data.config.waitType === 'duration' && data.config.duration) {
      const seconds = data.config.duration / 1000
      if (seconds < 60) return `${seconds.toFixed(0)}s`
      if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`
      return `${(seconds / 3600).toFixed(1)}h`
    }
    if (data.config.waitType === 'event' && data.config.waitForEvent) {
      return `Event: ${data.config.waitForEvent}`
    }
    return 'Waiting...'
  }

  return (
    <div
      className={`workflow-node relative min-w-[160px] rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-all dark:bg-gray-800 ${
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
        className="!border-2 !bg-cyan-500 dark:!border-cyan-400"
      />

      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-cyan-500 dark:!border-cyan-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">⏸️</span>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{data.label || 'Wait'}</div>
          <div className="text-xs text-cyan-600 dark:text-cyan-400">{getWaitInfo()}</div>
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
