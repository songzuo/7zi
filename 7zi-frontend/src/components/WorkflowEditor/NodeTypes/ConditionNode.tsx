/**
 * ConditionNode - 条件节点
 *
 * 条件分支节点
 */

import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NODE_COLORS } from '../constants';
import type { WorkflowNodeData } from '../types';

export function ConditionNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.condition;

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
        className="!border-2 !bg-amber-500 dark:!border-amber-400"
      />

      {/* True 分支句柄 */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!border-2 !bg-green-500 dark:!border-green-400"
      />

      {/* False 分支句柄 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!border-2 !bg-red-500 dark:!border-red-400"
      />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔀</span>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            {data.label || 'Condition'}
          </div>
          {data.config.condition && (
            <div className="mt-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              {data.config.condition}
            </div>
          )}
        </div>
      </div>

      {/* 分支标签 */}
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-green-600 dark:text-green-400">True →</span>
        <span className="text-red-600 dark:text-red-400">↓ False</span>
      </div>

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
