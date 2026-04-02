/**
 * AgentNode - Agent 节点
 *
 * 执行 AI 任务的节点
 */

import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NODE_COLORS } from '../constants';
import type { WorkflowNodeData } from '../types';

export function AgentNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.agent;

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
        className="!border-2 !bg-indigo-500 dark:!border-indigo-400"
      />

      {/* 输出句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!border-2 !bg-indigo-500 dark:!border-indigo-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Agent'}
          </div>
          {data.config.agentType && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400">
              {data.config.agentType}
            </div>
          )}
          {data.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* 超时配置 */}
      {data.config.timeout && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>⏱️</span>
          <span>{(data.config.timeout / 1000).toFixed(0)}s</span>
        </div>
      )}

      {/* 执行状态指示器 */}
      {data.executionStatus && (
        <div
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            backgroundColor:
              data.executionStatus === 'SUCCESS'
                ? '#10B981'
                : data.executionStatus === 'FAILED'
                ? '#EF4444'
                : '#3B82F6',
          }}
        >
          {data.executionStatus === 'SUCCESS' ? '✓' : data.executionStatus === 'FAILED' ? '✗' : '⏳'}
        </div>
      )}
    </div>
  );
}
