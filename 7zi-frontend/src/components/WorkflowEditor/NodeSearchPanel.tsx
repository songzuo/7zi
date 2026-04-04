/**
 * 节点搜索面板组件
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 在画布上搜索节点
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Search, X, MapPin, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react'
import type { Node } from 'reactflow'
import type { WorkflowNodeData, NodeType } from './types'

interface NodeSearchPanelProps {
  nodes: Node<WorkflowNodeData>[]
  onNodeSelect: (nodeId: string) => void
  isOpen: boolean
  onClose: () => void
}

export const NodeSearchPanel: React.FC<NodeSearchPanelProps> = ({
  nodes,
  onNodeSelect,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase()
    return nodes.filter(
      (node) =>
        node.data.label.toLowerCase().includes(query) ||
        node.data.description?.toLowerCase().includes(query) ||
        node.data.type.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
    )
  }, [nodes, searchQuery])

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filteredNodes.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredNodes[selectedIndex]) {
            onNodeSelect(filteredNodes[selectedIndex].id)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredNodes, selectedIndex, onNodeSelect, onClose])

  if (!isOpen) return null

  // 节点类型图标映射
  const getNodeIcon = (type: NodeType): string => {
    const icons: Record<NodeType, string> = {
      start: '▶️',
      end: '⏹️',
      agent: '🤖',
      condition: '🔀',
      parallel: '⚡',
      wait: '⏸️',
      humanInput: '👤',
      loop: '🔄',
      subworkflow: '📦',
      transform: '🔀',
    }
    return icons[type] || '📦'
  }

  // 节点状态颜色映射
  const getNodeStatusColor = (status?: string): string => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      running: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      skipped: 'bg-gray-500',
      SUCCESS: 'bg-green-500',
      FAILED: 'bg-red-500',
    }
    return status ? colors[status] || 'bg-gray-400' : 'bg-gray-400'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* 搜索框 */}
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索节点... (按 Enter 选择，Esc 关闭)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none dark:text-white"
          />
          <span className="text-xs text-gray-400">
            {filteredNodes.length > 0 && `${selectedIndex + 1}/${filteredNodes.length}`}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 搜索结果 */}
        {searchQuery && (
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredNodes.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNodes.map((node, index) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      onNodeSelect(node.id)
                      onClose()
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    {/* 节点图标 */}
                    <span className="text-2xl">{getNodeIcon(node.data.type)}</span>

                    {/* 节点信息 */}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {node.data.label}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          {node.data.type}
                        </span>
                        {node.data.executionStatus && (
                          <span
                            className={`h-2 w-2 rounded-full ${getNodeStatusColor(
                              node.data.executionStatus
                            )}`}
                          />
                        )}
                      </div>
                      {node.data.description && (
                        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                          {node.data.description}
                        </p>
                      )}
                    </div>

                    {/* 位置信息 */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>
                        ({Math.round(node.position.x)}, {Math.round(node.position.y)})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>未找到匹配的节点</p>
              </div>
            )}
          </div>
        )}

        {/* 提示 */}
        {!searchQuery && (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            <p className="text-sm">输入节点名称、类型或描述进行搜索</p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                导航
              </span>
              <span className="flex items-center gap-1">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-700">
                  Enter
                </span>
                选择
              </span>
              <span className="flex items-center gap-1">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono dark:bg-gray-700">
                  Esc
                </span>
                关闭
              </span>
            </div>
          </div>
        )}

        {/* 底部统计 */}
        {searchQuery && filteredNodes.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            找到 {filteredNodes.length} 个节点
          </div>
        )}
      </div>
    </div>
  )
}

export default NodeSearchPanel