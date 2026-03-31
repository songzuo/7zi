'use client';

import React from 'react';
import {
  WorkflowInstance,
  NodeExecutionResult,
  InstanceStatus,
  NodeStatus,
} from '@/types/workflow';
import { cn } from '@/lib/utils';

/**
 * 状态颜色映射
 */
const STATUS_COLORS: Record<InstanceStatus, string> = {
  pending: 'bg-gray-400',
  running: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
};

/**
 * 状态文本映射
 */
const STATUS_TEXT: Record<InstanceStatus, string> = {
  pending: '待运行',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

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
};

/**
 * 运行实例属性
 */
interface InstanceViewerProps {
  instance: WorkflowInstance;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

/**
 * 运行实例查看器
 */
export function InstanceViewer({
  instance,
  onCancel,
  onRetry,
  className,
}: InstanceViewerProps) {
  const isRunning = instance.status === 'running';

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              STATUS_COLORS[instance.status]
            )}
          />
          <span className="font-medium">
            {STATUS_TEXT[instance.status]}
          </span>
          <span className="text-sm text-gray-500">
            {instance.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              取消
            </button>
          )}
          {instance.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              重试
            </button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>执行进度</span>
          <span>
            {instance.progress.completed}/{instance.progress.total} 节点
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
      <div className="px-4 py-3 border-t">
        <div className="text-sm font-medium text-gray-900 mb-3">
          节点执行状态
        </div>
        <div className="space-y-2">
          {Array.from(instance.nodeResults.values()).map((result) => (
            <NodeExecutionItem key={result.nodeId} result={result} />
          ))}
        </div>
      </div>

      {/* 时间信息 */}
      <div className="px-4 py-3 border-t text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>开始时间</span>
          <span>{new Date(instance.metadata.startedAt).toLocaleString()}</span>
        </div>
        {instance.metadata.endedAt && (
          <div className="flex items-center justify-between mt-1">
            <span>结束时间</span>
            <span>{new Date(instance.metadata.endedAt).toLocaleString()}</span>
          </div>
        )}
        {instance.metadata.duration && (
          <div className="flex items-center justify-between mt-1">
            <span>运行时长</span>
            <span>{instance.metadata.duration} ms</span>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {instance.error && (
        <div className="px-4 py-3 border-t bg-red-50">
          <div className="text-sm font-medium text-red-700 mb-1">
            错误信息
          </div>
          <div className="text-sm text-red-600">
            {instance.error.message}
          </div>
          {instance.error.nodeId && (
            <div className="text-xs text-red-500 mt-1">
              节点: {instance.error.nodeId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 节点执行项
 */
function NodeExecutionItem({ result }: { result: NodeExecutionResult }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              NODE_STATUS_COLORS[result.status]
            )}
          />
          <span className="text-sm font-medium">{result.nodeId}</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          {result.duration && <span>{result.duration} ms</span>}
          <svg
            className={cn(
              'w-4 h-4 transition-transform',
              expanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t text-sm">
          {result.input && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">输入</div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.input, null, 2)}
              </pre>
            </div>
          )}

          {result.output && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-500 mb-1">输出</div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          )}

          {result.error && (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">错误</div>
              <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto text-red-600">
                {result.error.message}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 实例列表属性
 */
interface InstanceListProps {
  instances: WorkflowInstance[];
  onSelect?: (instanceId: string) => void;
  selectedId?: string;
  className?: string;
}

/**
 * 运行实例列表
 */
export function InstanceList({
  instances,
  onSelect,
  selectedId,
  className,
}: InstanceListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {instances.map((instance) => (
        <button
          key={instance.id}
          onClick={() => onSelect?.(instance.id)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors',
            selectedId === instance.id
              ? 'bg-blue-50 border-blue-300'
              : 'hover:bg-gray-50'
          )}
        >
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              STATUS_COLORS[instance.status]
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {instance.id}
              </span>
              <span className="text-xs text-gray-500">
                {instance.progress.percentage}%
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <span>{STATUS_TEXT[instance.status]}</span>
              <span>
                {new Date(instance.metadata.startedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </button>
      ))}

      {instances.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-8">
          暂无运行记录
        </div>
      )}
    </div>
  );
}
