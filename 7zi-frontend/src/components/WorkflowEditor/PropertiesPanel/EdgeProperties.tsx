/**
 * EdgeProperties - 边属性编辑器
 *
 * 编辑连接线的属性
 * v1.10.0 新增
 */

import React, { useState } from 'react'
import type { Edge } from 'reactflow'
import type { WorkflowEdgeData } from '../types'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'

interface EdgePropertiesProps {
  edge: Edge<WorkflowEdgeData>
  onChange?: (data: Partial<WorkflowEdgeData>) => void
}

export function EdgeProperties({ edge, onChange }: EdgePropertiesProps) {
  const { data, source, target } = edge
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const handleChange = (field: string, value: unknown) => {
    onChange?.({ [field]: value } as Partial<WorkflowEdgeData>)
  }

  const handleConditionChange = (field: string, value: unknown) => {
    onChange?.({
      conditionConfig: {
        ...(data?.conditionConfig || {}),
        [field]: value,
      },
    } as Partial<WorkflowEdgeData>)
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">连接线属性</h2>

      {/* 基本信息 */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            连接线 ID
          </label>
          <input
            type="text"
            value={edge.id}
            disabled
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              源节点
            </label>
            <input
              type="text"
              value={source}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              目标节点
            </label>
            <input
              type="text"
              value={target}
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* 连接类型 */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          连接类型
        </label>
        <select
          value={data?.conditionConfig?.edgeType || 'default'}
          onChange={e => handleConditionChange('edgeType', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
        >
          <option value="default">默认</option>
          <option value="conditional">条件</option>
          <option value="animated">动画</option>
        </select>
      </div>

      {/* 条件配置 */}
      {data?.conditionConfig?.edgeType === 'conditional' && (
        <Section
          title="条件配置"
          sectionKey="condition"
          expanded={expandedSections.has('condition')}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                条件标签
              </label>
              <input
                type="text"
                value={data?.conditionConfig?.label || ''}
                onChange={e => handleConditionChange('label', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="例如: 是 / 否"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                条件表达式
              </label>
              <input
                type="text"
                value={data?.conditionConfig?.expression || ''}
                onChange={e => handleConditionChange('expression', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="例如: result === true"
              />
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>条件表达式为真时，工作流将沿此连接线执行</p>
            </div>
          </div>
        </Section>
      )}

      {/* 样式配置 */}
      <Section
        title="样式配置"
        sectionKey="style"
        expanded={expandedSections.has('style')}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              线条颜色
            </label>
            <div className="flex gap-2">
              {['#94A3B8', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
                <button
                  key={color}
                  onClick={() => handleChange('strokeColor', color)}
                  className={`h-8 w-8 rounded-lg border-2 transition-all ${
                    data?.strokeColor === color
                      ? 'border-indigo-500 scale-110'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              线条宽度
            </label>
            <select
              value={data?.strokeWidth || 2}
              onChange={e => handleChange('strokeWidth', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
            >
              <option value={1}>细 (1px)</option>
              <option value={2}>正常 (2px)</option>
              <option value={3}>粗 (3px)</option>
              <option value={4}>加粗 (4px)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* 删除按钮 */}
      <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          按 Delete 键删除选中的连接线
        </p>
      </div>
    </div>
  )
}

// 可折叠部分组件
function Section({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string
  sectionKey: string
  expanded: boolean
  onToggle: (key: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
      >
        <span>{title}</span>
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {expanded && <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">{children}</div>}
    </div>
  )
}
