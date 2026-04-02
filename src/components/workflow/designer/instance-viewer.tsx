'use client'

import React from 'react'
import { WorkflowInstance, NodeExecutionResult, InstanceStatus, NodeStatus } from '@/types/workflow'
import { cn } from '@/lib/utils'

/**
 * 状态颜色映射
 */
const STATUS_COLORS: Record<InstanceStatus, string> = {
  pending: 'bg-gray-400',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
}

/**
 * 状态文本映射
 */
const STATUS_TEXT: Record<InstanceStatus, string> = {
  pending: '待运行',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
}

/**
 * 节点状态颜色
 */
const NODE_STATUS_COLORS: Record<NodeStatus, string> = {
  idle: 'bg-gray-200',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-gray-400',
  pending: 'bg-yellow-400',
}

/**
 * 运行实例属性
 */
interface InstanceViewerProps {
  instance: WorkflowInstance
  onCancel?: () => void
  onRetry?: () => void
  className?: string
}

/**
 * 运行实例查看器
 */
export function InstanceViewer({ instance, onCancel, onRetry, className }: InstanceViewerProps) {
  const isRunning = instance.status === 'running'

  return (
    <div className={cn('rounded-lg border bg-white shadow-sm', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn('h-3 w-3 rounded-full', STATUS_COLORS[instance.status])} />
          <span className="font-medium">{STATUS_TEXT[instance.status]}</span>
          <span className="text-sm text-gray-500">{instance.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              取消
            </button>
          )}
          {instance.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="rounded px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50"
            >
              重试
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <span>执行进度</span>
          <span>
            {instance.progress.completed}/{instance.progress.total} 节点
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full transition-all duration-300',
              instance.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            )}
            style={{ width: `${instance.progress.percentage}%` }}
          />
        </div>
      </div>

      {/* 节点执行列表 */}
      <div className="border-t px-4 py-3">
        <div className="mb-3 text-sm font-medium text-gray-900">节点执行状态</div>
        <div className="space-y-2">
          {Array.from(instance.nodeResults.values()).map(result => (
            <NodeExecutionItem key={result.nodeId} result={result} />
          ))}
        </div>
      </div>

      {/* 时间信息 */}
      <div className="border-t px-4 py-3 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>开始时间</span>
          <span>{new Date(instance.metadata.startedAt).toLocaleString()}</span>
        </div>
        {instance.metadata.endedAt && (
          <div className="mt-1 flex items-center justify-between">
            <span>结束时间</span>
            <span>{new Date(instance.metadata.endedAt).toLocaleString()}</span>
          </div>
        )}
        {instance.metadata.duration && (
          <div className="mt-1 flex items-center justify-between">
            <span>运行时长</span>
            <span>{instance.metadata.duration} ms</span>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {instance.error && (
        <div className="border-t bg-red-50 px-4 py-3">
          <div className="mb-1 text-sm font-medium text-red-700">错误信息</div>
          <div className="text-sm text-red-600">{instance.error.message}</div>
          {instance.error.nodeId && (
            <div className="mt-1 text-xs text-red-500">节点: {instance.error.nodeId}</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 节点执行项
 */
function NodeExecutionItem({ result }: { result: NodeExecutionResult }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className={cn('h-2.5 w-2.5 rounded-full', NODE_STATUS_COLORS[result.status])} />
          <span className="text-sm font-medium">{result.nodeId}</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          {result.duration && <span>{result.duration} ms</span>}
          <svg
            className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 py-2 text-sm">
          {result.input && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-gray-500">输入</div>
              <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(result.input, null, 2)}
              </pre>
            </div>
          )}

          {result.output && (
            <div className="mb-2">
              <div className="mb-1 text-xs font-medium text-gray-500">输出</div>
              <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          )}

          {result.error && (
            <div>
              <div className="mb-1 text-xs font-medium text-red-500">错误</div>
              <pre className="overflow-x-auto rounded bg-red-50 p-2 text-xs text-red-600">
                {result.error.message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 实例列表属性
 */
interface InstanceListProps {
  instances: WorkflowInstance[]
  onSelect?: (instanceId: string) => void
  selectedId?: string
  className?: string
}

/**
 * 运行实例列表
 */
export function InstanceList({ instances, onSelect, selectedId, className }: InstanceListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {instances.map(instance => (
        <button
          key={instance.id}
          onClick={() => onSelect?.(instance.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
            selectedId === instance.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'
          )}
        >
          <div className={cn('h-2.5 w-2.5 rounded-full', STATUS_COLORS[instance.status])} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{instance.id}</span>
              <span className="text-xs text-gray-500">{instance.progress.percentage}%</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{STATUS_TEXT[instance.status]}</span>
              <span>{new Date(instance.metadata.startedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </button>
      ))}

      {instances.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-500">暂无运行记录</div>
      )}
    </div>
  )
}
