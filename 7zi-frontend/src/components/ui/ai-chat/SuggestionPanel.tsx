'use client'

/**
 * SuggestionPanel - AI 建议面板组件
 * 显示上下文相关的快捷建议
 * v1.12.x
 */

import React, { useCallback, useMemo } from 'react'
import clsx from 'clsx'
import type { AISuggestion, SuggestionCategory, AISuggestion as SuggestionType } from './types'

// ============================================
// Category 配置
// ============================================

const CATEGORY_CONFIG: Record<
  SuggestionCategory,
  { icon: string; label: string; color: string }
> = {
  general: {
    icon: '💬',
    label: '常规',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  workflow: {
    icon: '⚡',
    label: '工作流',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  data: {
    icon: '📊',
    label: '数据',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  code: {
    icon: '🔧',
    label: '代码',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  debug: {
    icon: '🐛',
    label: '调试',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
}

// ============================================
// 单个建议项
// ============================================

interface SuggestionItemProps {
  suggestion: SuggestionType
  onClick: (suggestion: SuggestionType) => void
  compact?: boolean
}

const SuggestionItem: React.FC<SuggestionItemProps> = ({
  suggestion,
  onClick,
  compact = false,
}) => {
  const config = CATEGORY_CONFIG[suggestion.category] || CATEGORY_CONFIG.general

  const handleClick = useCallback(() => {
    onClick(suggestion)
  }, [suggestion, onClick])

  return (
    <button
      onClick={handleClick}
      disabled={suggestion.executed}
      className={clsx(
        'group relative flex flex-col rounded-xl transition-all',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'hover:border-blue-300 dark:hover:border-blue-600',
        'hover:shadow-md hover:shadow-blue-500/10',
        'hover:-translate-y-0.5',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
        compact ? 'p-2.5' : 'p-3'
      )}
    >
      {/* 标签和图标 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{config.icon}</span>
        <span
          className={clsx(
            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
            config.color
          )}
        >
          {config.label}
        </span>
        {suggestion.executed && (
          <span className="ml-auto text-xs text-green-500">✓</span>
        )}
      </div>

      {/* 建议文本 */}
      <span
        className={clsx(
          'text-left font-medium text-gray-900 dark:text-gray-100',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {suggestion.text}
      </span>

      {/* 描述 */}
      {suggestion.description && !compact && (
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-left line-clamp-2">
          {suggestion.description}
        </span>
      )}

      {/* 优先级指示 */}
      {suggestion.priority === 'high' && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
    </button>
  )
}

// ============================================
// 建议面板
// ============================================

export interface SuggestionPanelProps {
  /** 建议列表 */
  suggestions: AISuggestion[]
  /** 是否加载中 */
  isLoading: boolean
  /** 点击回调 */
  onSuggestionClick: (suggestion: AISuggestion) => void
  /** 刷新回调 */
  onRefresh?: () => void
  /** 关闭回调 */
  onClose?: () => void
  /** 是否最小化 */
  minimized?: boolean
  /** 是否紧凑模式 */
  compact?: boolean
  /** 自定义类名 */
  className?: string
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({
  suggestions,
  isLoading,
  onSuggestionClick,
  onRefresh,
  onClose,
  minimized = false,
  compact = false,
  className,
}) => {
  // 按分类分组
  const groupedSuggestions = useMemo(() => {
    const groups: Partial<Record<SuggestionCategory, AISuggestion[]>> = {}
    for (const suggestion of suggestions) {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = []
      }
      groups[suggestion.category]!.push(suggestion)
    }
    return groups
  }, [suggestions])

  // 加载骨架屏
  if (isLoading) {
    return (
      <div className={clsx('bg-white dark:bg-gray-800 rounded-xl', className)}>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 最小化模式
  if (minimized) {
    return (
      <button
        onClick={onClose}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-blue-100 dark:bg-blue-900/30',
          'text-blue-700 dark:text-blue-300',
          'text-sm font-medium',
          'hover:bg-blue-200 dark:hover:bg-blue-900/50',
          'transition-colors',
          className
        )}
      >
        <span>💡</span>
        <span>查看建议</span>
        {suggestions.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
            {suggestions.length}
          </span>
        )}
      </button>
    )
  }

  // 空状态
  if (suggestions.length === 0) {
    return (
      <div className={clsx('bg-white dark:bg-gray-800 rounded-xl', className)}>
        <div className="p-4 text-center">
          <div className="text-4xl mb-2">💡</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            输入消息后，我会为你提供相关建议
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={clsx(
                'mt-3 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-gray-100 dark:bg-gray-700',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-gray-600',
                'transition-colors'
              )}
            >
              刷新建议
            </button>
          )}
        </div>
      </div>
    )
  }

  // 完整模式
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl overflow-hidden',
        'border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">智能建议</h3>
          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
            {suggestions.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={clsx(
                'p-1.5 rounded-lg text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors'
              )}
              title="刷新建议"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={clsx(
                'p-1.5 rounded-lg text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors'
              )}
              title="关闭"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 建议列表 */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        {compact ? (
          // 紧凑网格
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                onClick={onSuggestionClick}
                compact
              />
            ))}
          </div>
        ) : (
          // 分组列表
          <div className="space-y-4">
            {Object.entries(groupedSuggestions).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {CATEGORY_CONFIG[category as SuggestionCategory]?.icon}{' '}
                  {CATEGORY_CONFIG[category as SuggestionCategory]?.label}
                </h4>
                <div className="space-y-2">
                  {items!.map((suggestion) => (
                    <SuggestionItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      onClick={onSuggestionClick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          点击建议将自动发送，也可以直接输入
        </p>
      </div>
    </div>
  )
}

export default SuggestionPanel
