'use client'

/**
 * NodePalette.tsx
 * 节点面板组件 - 提供可拖拽的节点类型
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { NodeType } from '@/types/workflow'

/**
 * 节点类型定义
 */
export interface PaletteNodeType {
  type: NodeType
  label: string
  icon: string
  description: string
  color: {
    bg: string
    border: string
    text: string
  }
}

/**
 * 节点面板属性
 */
export interface NodePaletteProps {
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 节点类型点击回调 */
  onNodeClick?: (type: NodeType) => void
}

/**
 * 节点类型配置
 */
const NODE_TYPE_CONFIG: PaletteNodeType[] = [
  {
    type: NodeType.START,
    label: '开始',
    icon: '▶',
    description: '工作流起始节点',
    color: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  },
  {
    type: NodeType.END,
    label: '结束',
    icon: '⏹',
    description: '工作流结束节点',
    color: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  },
  {
    type: NodeType.AGENT,
    label: '任务',
    icon: '🤖',
    description: '执行 Agent 任务',
    color: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' },
  },
  {
    type: NodeType.CONDITION,
    label: '条件',
    icon: '⚡',
    description: '基于条件分支',
    color: { bg: '#fef9c3', border: '#ca8a04', text: '#854d0e' },
  },
  {
    type: NodeType.PARALLEL,
    label: '并行',
    icon: '⚡',
    description: '并行执行多个分支',
    color: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8' },
  },
  {
    type: NodeType.WAIT,
    label: '等待',
    icon: '⏱',
    description: '等待指定时间',
    color: { bg: '#e0e7ff', border: '#4f46e5', text: '#3730a3' },
  },
]

/**
 * 节点面板组件
 */
export function NodePalette({ disabled = false, className, onNodeClick }: NodePaletteProps) {
  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    if (disabled) {
      e.preventDefault()
      return
    }
    // 设置拖拽数据
    e.dataTransfer.setData('application/workflow-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
    
    // 设置拖拽预览样式
    const preview = document.createElement('div')
    preview.textContent = NODE_TYPE_CONFIG.find(n => n.type === nodeType)?.label || nodeType
    preview.style.cssText = `
      padding: 8px 16px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      position: fixed;
      top: -1000px;
    `
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 50, 20)
    
    // 清理预览元素
    setTimeout(() => document.body.removeChild(preview), 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // 可以在拖拽结束时做一些清理
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      {/* 标题 */}
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">节点面板</h3>
        <span className="text-xs text-gray-500">拖拽到画布</span>
      </div>

      {/* 节点列表 */}
      <div className="flex flex-col gap-2">
        {NODE_TYPE_CONFIG.map((nodeType) => (
          <div
            key={nodeType.type}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, nodeType.type)}
            onDragEnd={handleDragEnd}
            onClick={() => !disabled && onNodeClick?.(nodeType.type)}
            className={cn(
              'group flex cursor-grab items-start gap-3 rounded-lg border-2 p-3 transition-all',
              'hover:shadow-md active:cursor-grabbing',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{
              backgroundColor: nodeType.color.bg,
              borderColor: nodeType.color.border,
            }}
          >
            {/* 图标 */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg"
              style={{
                backgroundColor: 'white',
                color: nodeType.color.text,
              }}
            >
              {nodeType.icon}
            </div>

            {/* 文本内容 */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium"
                style={{ color: nodeType.color.text }}
              >
                {nodeType.label}
              </div>
              <div className="truncate text-xs text-gray-600">
                {nodeType.description}
              </div>
            </div>

            {/* 拖拽指示器 */}
            <div className={cn(
              'opacity-0 transition-opacity group-hover:opacity-100',
              disabled && 'hidden'
            )}>
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* 提示 */}
      <div className="mt-3 border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-500">
          💡 拖拽节点到画布或点击添加
        </p>
      </div>
    </div>
  )
}

/**
 * 获取节点类型的默认配置
 */
export function getDefaultNodeConfig(type: NodeType): Partial<{
  name: string
  description: string
  config: Record<string, unknown>
}> {
  switch (type) {
    case NodeType.START:
      return {
        name: '开始',
        description: '工作流起始节点',
        config: {},
      }
    case NodeType.END:
      return {
        name: '结束',
        description: '工作流结束节点',
        config: {},
      }
    case NodeType.AGENT:
      return {
        name: '新任务',
        description: '执行 Agent 任务',
        config: {
          agentId: '',
          prompt: '',
        },
      }
    case NodeType.CONDITION:
      return {
        name: '条件判断',
        description: '基于条件分支',
        config: {
          expression: '',
          trueLabel: '是',
          falseLabel: '否',
        },
      }
    case NodeType.PARALLEL:
      return {
        name: '并行执行',
        description: '并行执行多个分支',
        config: {
          maxConcurrency: 3,
          failurePolicy: 'fail-fast',
        },
      }
    case NodeType.WAIT:
      return {
        name: '等待',
        description: '等待指定时间',
        config: {
          duration: 10,
        },
      }
    default:
      return {
        name: '新节点',
        description: '',
        config: {},
      }
  }
}

export default NodePalette
