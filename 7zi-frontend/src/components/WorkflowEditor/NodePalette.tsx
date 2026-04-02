/**
 * NodePalette - 节点面板
 *
 * 左侧可拖拽的节点选择器
 */

import React from 'react'
import { NODE_TEMPLATES } from './constants'
import type { NodeType } from './types'

interface NodePaletteProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void
  disabled?: boolean
}

export function NodePalette({ onNodeDragStart, disabled = false }: NodePaletteProps) {
  const nodeCategories = {
    basic: ['start', 'end'] as NodeType[],
    agent: ['agent'] as NodeType[],
    logic: ['condition', 'parallel'] as NodeType[],
    flow: ['wait', 'humanInput'] as NodeType[],
  }

  const categoryLabels = {
    basic: '基础',
    agent: 'Agent',
    logic: '逻辑',
    flow: '流程',
  }

  return (
    <div className="w-64 border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">节点面板</h3>

      {Object.entries(nodeCategories).map(([category, nodeTypes]) => (
        <div key={category} className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h4>
          <div className="space-y-2">
            {nodeTypes.map(nodeType => {
              const template = NODE_TEMPLATES[nodeType]
              return (
                <div
                  key={nodeType}
                  draggable={!disabled}
                  onDragStart={e => onNodeDragStart(e, nodeType)}
                  className={`flex cursor-move items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-400 hover:shadow-sm dark:border-gray-700 dark:hover:border-gray-600 ${
                    disabled ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {template.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {template.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* 使用提示 */}
      <div className="mt-6 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <p className="font-semibold">💡 提示</p>
        <p className="mt-1">拖拽节点到画布上创建工作流</p>
      </div>
    </div>
  )
}
