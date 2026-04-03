/**
 * NodePalette - 节点面板
 *
 * 左侧可拖拽的节点选择器
 * v1.9.1 更新: 新增搜索功能、新节点类型
 */

import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { NODE_TEMPLATES, NODE_CATEGORY_LABELS } from './constants'
import type { NodeType, NodeCategory } from './types'

interface NodePaletteProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void
  disabled?: boolean
}

/**
 * 节点面板组件
 */
export function NodePalette({ onNodeDragStart, disabled = false }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(['basic', 'agent', 'logic', 'flow'])
  )

  // 按类别分组节点
  const nodeCategories = useMemo(() => {
    const categories: Record<NodeCategory, NodeType[]> = {
      basic: ['start', 'end'],
      agent: ['agent'],
      logic: ['condition', 'parallel', 'loop'], // v1.9.1: 新增 loop
      flow: ['wait', 'humanInput', 'subworkflow', 'transform'], // v1.9.1: 新增 subworkflow, transform
      custom: [],
    }
    return categories
  }, [])

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodeCategories
    }

    const query = searchQuery.toLowerCase()
    const filtered: Record<NodeCategory, NodeType[]> = {
      basic: [],
      agent: [],
      logic: [],
      flow: [],
      custom: [],
    }

    Object.entries(nodeCategories).forEach(([category, nodeTypes]) => {
      nodeTypes.forEach(nodeType => {
        const template = NODE_TEMPLATES[nodeType]
        if (
          template.label.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query)
        ) {
          filtered[category as NodeCategory].push(nodeType)
        }
      })
    })

    return filtered
  }, [searchQuery, nodeCategories])

  // 切换类别展开/折叠
  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // 搜索时自动展开所有类别
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    if (value.trim()) {
      // 搜索时展开所有类别
      setExpandedCategories(new Set(['basic', 'agent', 'logic', 'flow', 'custom']))
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* 标题 */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">节点面板</h3>
      </div>

      {/* 搜索框 */}
      <div className="border-b border-gray-200 p-3 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="搜索节点..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          />
        </div>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(filteredNodes).map(([category, nodeTypes]) => {
          if (nodeTypes.length === 0) return null

          const isExpanded = expandedCategories.has(category as NodeCategory)
          const categoryLabel = NODE_CATEGORY_LABELS[category as NodeCategory]

          return (
            <div key={category} className="mb-3">
              {/* 类别标题 */}
              <button
                type="button"
                onClick={() => toggleCategory(category as NodeCategory)}
                className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{categoryLabel}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {nodeTypes.length}
                </span>
              </button>

              {/* 节点列表 */}
              {isExpanded && (
                <div className="mt-1 space-y-1.5 pl-2">
                  {nodeTypes.map(nodeType => {
                    const template = NODE_TEMPLATES[nodeType]
                    return (
                      <div
                        key={nodeType}
                        draggable={!disabled}
                        onDragStart={e => onNodeDragStart(e, nodeType)}
                        className={`flex cursor-move items-center gap-2.5 rounded-lg border border-gray-200 p-2.5 transition-all hover:border-gray-400 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600 ${
                          disabled ? 'cursor-not-allowed opacity-50' : ''
                        }`}
                      >
                        <span className="text-xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-gray-900 dark:text-white">
                            {template.label}
                          </div>
                          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 无搜索结果 */}
        {searchQuery.trim() &&
          Object.values(filteredNodes).every(types => types.length === 0) && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>未找到匹配的节点</p>
              <p className="mt-1 text-xs">尝试其他关键词</p>
            </div>
          )}
      </div>

      {/* 使用提示 */}
      <div className="border-t border-gray-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-gray-700 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-semibold">💡 提示</p>
        <p className="mt-1">拖拽节点到画布上创建工作流</p>
        <p className="mt-1">使用搜索框快速查找节点</p>
      </div>
    </div>
  )
}

export default NodePalette