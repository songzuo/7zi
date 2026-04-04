/**
 * NodeWrapper - 节点包装组件
 *
 * 为所有节点提供统一的选中高亮效果
 * v1.10.1 UX增强: 发光边框、脉冲效果、悬停反馈
 */

import React, { memo, ReactNode } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { WorkflowNodeData } from '../types'

interface NodeWrapperProps {
  children: ReactNode
  data: WorkflowNodeData
  selected: boolean
  type?: string
  colors?: {
    light: string
    dark: string
    bg: string
  }
}

/**
 * 节点包装组件 - 提供统一的选中高亮效果
 */
export const NodeWrapper = memo(({ children, data, selected, type, colors }: NodeWrapperProps) => {
  // 节点类型对应的颜色
  const nodeColors = colors || {
    light: selected ? '#6366F1' : '#CBD5E1',
    dark: selected ? '#818CF8' : '#475569',
    bg: selected ? '#EEF2FF' : '#F8FAFC',
  }

  // 执行状态颜色
  const statusColors: Record<string, string> = {
    running: '#3B82F6',
    success: '#10B981',
    failed: '#EF4444',
    pending: '#6B7280',
  }

  return (
    <div
      className={`
        workflow-node-wrapper relative min-w-[180px] rounded-lg border-2 
        bg-white px-4 py-3 shadow-sm transition-all duration-200
        dark:bg-gray-800
        ${selected 
          ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-300 ring-opacity-50' 
          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
        }
      `}
      style={{
        borderColor: selected ? '#6366F1' : nodeColors.light,
        backgroundColor: selected ? undefined : nodeColors.bg,
        boxShadow: selected 
          ? '0 0 20px rgba(99, 102, 241, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1)' 
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* 脉冲动画效果 - 仅选中时显示 */}
      {selected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            animation: 'pulse-border 2s ease-in-out infinite',
            border: '2px solid transparent',
            borderColor: '#6366F1',
            opacity: 0.5,
          }}
        />
      )}

      {/* 节点内容 */}
      <div className="relative z-10">
        {children}
      </div>

      {/* 执行状态指示器 */}
      {data.executionStatus && (
        <div
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm dark:border-gray-800"
          style={{
            backgroundColor: statusColors[data.executionStatus] || '#6B7280',
            animation: data.executionStatus === 'running' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {data.executionStatus === 'success' ? '✓' : 
           data.executionStatus === 'failed' ? '✗' : 
           data.executionStatus === 'running' ? '▶' : '○'}
        </div>
      )}

      {/* 连接状态指示器 - 当有连接线经过时 */}
      {data.config?.isActive && (
        <div
          className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500"
          style={{
            animation: 'pulse 1s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
})

NodeWrapper.displayName = 'NodeWrapper'

/**
 * 标准节点句柄样式
 */
export const nodeHandleClassName = `
  !border-2 !border-indigo-500 !bg-white dark:!bg-gray-800
  hover:!bg-indigo-100 dark:hover:!bg-indigo-900
  transition-all duration-150
`

/**
 * 输入句柄
 */
export const InputHandle = memo(({ 
  className = '', 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Handle
    type="target"
    position={Position.Left}
    className={`${nodeHandleClassName} ${className}`}
    {...props}
  />
))

InputHandle.displayName = 'InputHandle'

/**
 * 输出句柄
 */
export const OutputHandle = memo(({ 
  className = '', 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Handle
    type="source"
    position={Position.Right}
    className={`${nodeHandleClassName} ${className}`}
    {...props}
  />
))

OutputHandle.displayName = 'OutputHandle'

/**
 * 顶部句柄（用于并行节点等）
 */
export const TopHandle = memo(({ 
  className = '', 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Handle
    type="target"
    position={Position.Top}
    className={`${nodeHandleClassName} ${className}`}
    {...props}
  />
))

TopHandle.displayName = 'TopHandle'

/**
 * 底部句柄（用于并行节点等）
 */
export const BottomHandle = memo(({ 
  className = '', 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Handle
    type="source"
    position={Position.Bottom}
    className={`${nodeHandleClassName} ${className}`}
    {...props}
  />
))

BottomHandle.displayName = 'BottomHandle'

/**
 * 节点图标组件
 */
export const NodeIcon = memo(({ 
  emoji, 
  className = '' 
}: { 
  emoji: string
  className?: string 
}) => (
  <span className={`text-xl ${className}`}>{emoji}</span>
))

NodeIcon.displayName = 'NodeIcon'

/**
 * 节点标题组件
 */
export const NodeTitle = memo(({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) => (
  <div className={`font-semibold text-gray-900 dark:text-white ${className}`}>
    {children}
  </div>
))

NodeTitle.displayName = 'NodeTitle'

/**
 * 节点描述组件
 */
export const NodeDescription = memo(({ 
  children, 
  className = '' 
}: { 
  children: ReactNode
  className?: string 
}) => (
  <div className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>
    {children}
  </div>
))

NodeDescription.displayName = 'NodeDescription'

/**
 * 添加全局样式
 */
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('workflow-node-animations')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'workflow-node-animations'
    style.textContent = `
      @keyframes pulse-border {
        0%, 100% {
          opacity: 0.5;
          transform: scale(1);
        }
        50% {
          opacity: 0.2;
          transform: scale(1.02);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.2);
          opacity: 0.8;
        }
      }
      
      .workflow-node-wrapper {
        animation: node-appear 0.2s ease-out;
      }
      
      @keyframes node-appear {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `
    document.head.appendChild(style)
  }
}

export default NodeWrapper
