/**
 * @fileoverview 任务预览面板
 * @description 实时预览从自然语言解析出的工作流结构
 *
 * 功能:
 * - 节点列表预览
 * - 连接关系展示
 * - 编辑和确认操作
 * - 导出为JSON
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { ParsedTask, TaskIntent } from '@/lib/workflow/TaskParser'
import { NodeType, EdgeType } from '@/types/workflow'
import { cn } from '@/lib/utils'

/**
 * 节点类型图标和颜色
 */
const NODE_TYPE_STYLES: Record<NodeType, { icon: string; color: string; bg: string }> = {
  [NodeType.START]: { icon: '▶️', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
  [NodeType.END]: { icon: '⏹️', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
  [NodeType.AGENT]: { icon: '🤖', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
  [NodeType.CONDITION]: { icon: '⚡', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  [NodeType.PARALLEL]: { icon: '⚡', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' },
  [NodeType.WAIT]: { icon: '⏱️', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-700' },
  [NodeType.HUMAN_INPUT]: { icon: '👤', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
  [NodeType.LOOP]: { icon: '🔄', color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900' },
  [NodeType.SUBWORKFLOW]: { icon: '📋', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900' },
}

/**
 * 意图图标
 */
const INTENT_ICONS: Record<TaskIntent, string> = {
  automation: '⚙️',
  notification: '📧',
  data_processing: '📊',
  monitoring: '📡',
  integration: '🔗',
  scheduled: '⏰',
  webhook: '🪝',
  human_approval: '✋',
  unknown: '❓',
}

/**
 * 组件属性
 */
interface TaskPreviewPanelProps {
  /** 解析后的任务 */
  task: ParsedTask
  /** 创建回调 */
  onCreate: () => void
  /** 修改回调 */
  onModify: () => void
  /** 关闭回调 */
  onClose: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 节点项组件
 */
interface NodeItemProps {
  node: Partial<{ id: string; type: NodeType; name: string; position: { x: number; y: number } }>
  index: number
  isLast: boolean
}

function NodeItem({ node, index, isLast }: NodeItemProps) {
  const typeStyle = NODE_TYPE_STYLES[node.type || NodeType.AGENT]

  return (
    <div className="relative">
      {/* 连接线 */}
      {!isLast && (
        <div className="absolute left-5 top-10 h-6 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
      )}

      <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        {/* 节点图标 */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-lg',
            typeStyle.bg
          )}
        >
          {typeStyle.icon}
        </div>

        {/* 节点信息 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium', typeStyle.color)}>
              {node.name || '未命名节点'}
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              #{index + 1}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            类型: {node.type || 'unknown'}
          </div>
          {node.position && (
            <div className="mt-0.5 text-xs text-gray-400">
              位置: ({node.position.x}, {node.position.y})
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 边列表项组件
 */
interface EdgeItemProps {
  edge: Partial<{
    id: string
    source: string
    target: string
    type: EdgeType
  }>
  index: number
  nodeNames: Map<string, string>
}

function EdgeItem({ edge, index, nodeNames }: EdgeItemProps) {
  const sourceName = nodeNames.get(edge.source || '') || edge.source
  const targetName = nodeNames.get(edge.target || '') || edge.target

  const edgeTypeLabels: Record<EdgeType, string> = {
    [EdgeType.SEQUENCE]: '顺序',
    [EdgeType.CONDITION]: '条件',
    [EdgeType.PARALLEL]: '并行',
    [EdgeType.DEFAULT]: '默认',
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm dark:bg-gray-800">
      <span className="text-xs text-gray-400">#{index + 1}</span>
      <span className="truncate font-medium text-gray-700 dark:text-gray-300">{sourceName}</span>
      <span className="text-gray-400">→</span>
      <span className="truncate font-medium text-gray-700 dark:text-gray-300">{targetName}</span>
      <span className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {edgeTypeLabels[edge.type || EdgeType.SEQUENCE]}
      </span>
    </div>
  )
}

/**
 * 任务预览面板
 */
export function TaskPreviewPanel({ task, onCreate, onModify, onClose, className }: TaskPreviewPanelProps) {
  const [showJson, setShowJson] = useState(false)

  // 节点名称映射
  const nodeNames = useMemo(() => {
    const map = new Map<string, string>()
    task.nodes.forEach(node => {
      if (node.id && node.name) {
        map.set(node.id, node.name)
      }
    })
    return map
  }, [task.nodes])

  // 导出JSON
  const handleExportJson = useCallback(() => {
    const json = JSON.stringify(task, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.workflowName.replace(/\s+/g, '_')}_preview.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [task])

  return (
    <div className={cn('flex h-full flex-col bg-white dark:bg-gray-900', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">任务预览</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            确认工作流结构后创建任务
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label="关闭预览"
        >
          ✕
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 工作流基本信息 */}
        <div className="mb-6 rounded-lg bg-gradient-to-r from-cyan-50 to-purple-50 p-4 dark:from-cyan-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{INTENT_ICONS[task.intent]}</span>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{task.workflowName}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>置信度: {(task.confidence * 100).toFixed(0)}%</span>
                <span>•</span>
                <span>{task.nodes.length} 节点</span>
                <span>•</span>
                <span>{task.edges.length} 连接</span>
              </div>
            </div>
          </div>
        </div>

        {/* 节点列表 */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="font-medium text-gray-700 dark:text-gray-300">节点结构</h5>
            <span className="text-xs text-gray-400">{task.nodes.length} 个节点</span>
          </div>
          <div className="space-y-1">
            {task.nodes.map((node, index) => (
              <NodeItem
                key={node.id || `node-${index}`}
                node={node}
                index={index}
                isLast={index === task.nodes.length - 1}
              />
            ))}
          </div>
        </div>

        {/* 连接关系 */}
        {task.edges.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="font-medium text-gray-700 dark:text-gray-300">连接关系</h5>
              <span className="text-xs text-gray-400">{task.edges.length} 条边</span>
            </div>
            <div className="space-y-2">
              {task.edges.map((edge, index) => (
                <EdgeItem
                  key={edge.id || `edge-${index}`}
                  edge={edge}
                  index={index}
                  nodeNames={nodeNames}
                />
              ))}
            </div>
          </div>
        )}

        {/* 改进建议 */}
        {task.suggestions.length > 0 && (
          <div className="mb-6">
            <h5 className="mb-3 font-medium text-gray-700 dark:text-gray-300">改进建议</h5>
            <ul className="space-y-2">
              {task.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-yellow-500">💡</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* JSON预览 */}
        {showJson && (
          <div className="mb-6">
            <h5 className="mb-3 font-medium text-gray-700 dark:text-gray-300">JSON 数据</h5>
            <pre className="overflow-x-auto rounded-lg bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {JSON.stringify(task, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onModify}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            ✏️ 修改描述
          </button>
          <button
            onClick={onCreate}
            className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg"
          >
            ✅ 创建任务
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className="flex-1 rounded-lg bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {showJson ? '隐藏' : '显示'} JSON
          </button>
          <button
            onClick={handleExportJson}
            className="flex-1 rounded-lg bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            导出 JSON
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskPreviewPanel
