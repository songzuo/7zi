/**
 * AgentNode - Agent 节点 (v1.10.1 UX增强版)
 *
 * 执行 AI 任务的节点
 * 增强: 使用 NodeWrapper 统一样式、更好的视觉反馈
 */

import React from 'react'
import type { NodeProps } from 'reactflow'
import { NODE_COLORS } from '../constants'
import type { WorkflowNodeData } from '../types'
import { 
  NodeWrapper, 
  InputHandle, 
  OutputHandle, 
  NodeIcon, 
  NodeTitle, 
  NodeDescription 
} from './NodeWrapper'

export function AgentNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const colors = NODE_COLORS.agent

  return (
    <NodeWrapper 
      data={data} 
      selected={selected} 
      type="agent"
      colors={colors}
    >
      {/* 输入句柄 */}
      <InputHandle />

      {/* 输出句柄 */}
      <OutputHandle />

      {/* 节点图标和标题 */}
      <div className="flex items-center gap-2">
        <NodeIcon emoji="🤖" />
        <div className="flex-1">
          <NodeTitle>{data.label || 'Agent'}</NodeTitle>
          {data.config.agentType && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              {data.config.agentType}
            </div>
          )}
          {data.description && (
            <NodeDescription>{data.description}</NodeDescription>
          )}
        </div>
      </div>

      {/* 超时配置 */}
      {data.config.timeout && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
          <span>⏱️</span>
          <span>{(data.config.timeout / 1000).toFixed(0)}s</span>
        </div>
      )}

      {/* 重试配置 */}
      {data.config.maxRetries && data.config.maxRetries > 0 && (
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>🔄</span>
          <span>最多 {data.config.maxRetries} 次重试</span>
        </div>
      )}
    </NodeWrapper>
  )
}