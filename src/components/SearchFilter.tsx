'use client'

/**
 * @fileoverview 搜索与过滤组件
 * @description 提供通用的搜索框和过滤器 UI
 */

import React, { useState, useCallback, useMemo, memo } from 'react'
import Image from 'next/image'
import type {
  FilterConfig,
  SortConfig,
  ActiveFilters,
  SearchFilterResult,
} from '@/types/search-filter'
import { applySearchFilterSort, clearAllFilters, hasActiveFilters } from '@/lib/search-filter'

// ============================================================================
// Props 类型定义
// ============================================================================

export interface SearchFilterProps<T extends object> {
  /** 项目列表 */
  items: T[]
  /** 过滤器配置 */
  filters?: FilterConfig<T>[]
  /** 排序配置 */
  sorts?: SortConfig<T>[]
  /** 结果回调 */
  onResultsChange: (results: SearchFilterResult<T>) => void
  /** 是否显示排序 */
  showSort?: boolean
  /** 是否显示过滤器数量 */
  showFilterCount?: boolean
  /** 搜索占位符 */
  searchPlaceholder?: string
  /** 过滤器占位符 (保留用于未来扩展) */
  _filterPlaceholder?: string
  /** 是否折叠过滤器 */
  collapsible?: boolean
  /** 默认展开过滤器 */
  defaultExpanded?: boolean
  /** 额外的 CSS 类名 */
  className?: string
}

// ============================================================================
// 子组件：搜索框
// ============================================================================

interface SearchBoxProps {
  query: string
  onQueryChange: (query: string) => void
  placeholder?: string
  disabled?: boolean
}

const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  onQueryChange,
  placeholder = '搜索...',
  disabled,
}) => {
  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 placeholder-zinc-400 shadow-sm transition-all duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
      />
      <svg
        className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {query && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          title="清除搜索"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

// ============================================================================
// 子组件：过滤器下拉框
// ============================================================================

interface FilterDropdownProps {
  filter: FilterConfig
  selectedValues: unknown[]
  onSelectionChange: (values: unknown[]) => void
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filter,
  selectedValues,
  onSelectionChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => setIsOpen(!isOpen)

  const handleValueChange = (value: unknown) => {
    if (filter.multiple) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value]
      onSelectionChange(newValues)
    } else {
      onSelectionChange([value])
      setIsOpen(false)
    }
  }

  const handleClear = () => {
    onSelectionChange([])
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
          selectedValues.length > 0
            ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
            : 'border-zinc-300 bg-white text-zinc-700 hover:border-cyan-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
        }`}
      >
        <span className="text-base">{filter.label}</span>
        {selectedValues.length > 0 && (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-xs text-white">
            {selectedValues.length}
          </span>
        )}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* 下拉菜单 */}
          <div className="absolute z-20 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {filter.label}
              </span>
              {selectedValues.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  清除
                </button>
              )}
            </div>

            {/* 选项列表 */}
            <div className="max-h-64 overflow-y-auto">
              {filter.options.map(option => (
                <button
                  key={String(option.value)}
                  onClick={() => handleValueChange(option.value)}
                  className={`flex w-full items-center gap-3 px-4 py-2 transition-colors ${
                    selectedValues.includes(option.value)
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  {/* 图标/头像 */}
                  {option.icon && (
                    <div className="flex-shrink-0">
                      {option.icon.startsWith('http') ? (
                        <Image
                          src={option.icon}
                          alt={option.label}
                          width={20}
                          height={20}
                          sizes="20px"
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <span className="text-base">{option.icon}</span>
                      )}
                    </div>
                  )}

                  {/* 标签 */}
                  <span className="flex-1 truncate text-sm">{option.label}</span>

                  {/* 数量 */}
                  {option.count !== undefined && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">{option.count}</span>
                  )}

                  {/* 颜色指示器 */}
                  {option.color && !option.icon && (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}

                  {/* 多选复选框 */}
                  {filter.multiple && (
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
                        selectedValues.includes(option.value)
                          ? 'border-cyan-600 bg-cyan-600'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {selectedValues.includes(option.value) && (
                        <svg
                          className="h-2.5 w-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  )}
                </button>
              ))}

              {filter.options.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  暂无选项
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// 子组件：排序下拉框
// ============================================================================

interface SortDropdownProps {
  sorts: SortConfig<unknown>[]
  currentSort?: SortConfig<unknown>
  onSortChange: (sort: SortConfig<unknown>) => void
}

const SortDropdown: React.FC<SortDropdownProps> = ({ sorts, currentSort, onSortChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => setIsOpen(!isOpen)

  const handleSortSelect = (sort: SortConfig<unknown>) => {
    // 如果是当前排序，切换方向
    if (currentSort && currentSort.field === sort.field) {
      onSortChange({
        ...sort,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      })
    } else {
      onSortChange(sort)
    }
    setIsOpen(false)
  }

  const getSortLabel = (sort: SortConfig<unknown>): string => {
    const directionIcon = sort.direction === 'asc' ? '↑' : '↓'
    return `${String(sort.field)} ${directionIcon}`
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
          currentSort
            ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'border-zinc-300 bg-white text-zinc-700 hover:border-purple-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
        }`}
      >
        <span className="text-base">🔃</span>
        <span>{currentSort ? getSortLabel(currentSort) : '排序'}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* 下拉菜单 */}
          <div className="absolute z-20 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">排序方式</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {sorts.map((sort, index) => (
                <button
                  key={index}
                  onClick={() => handleSortSelect(sort)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors ${
                    currentSort && currentSort.field === sort.field
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  <span>{String(sort.field)}</span>
                  {currentSort && currentSort.field === sort.field ? (
                    <span className="font-mono">{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  ) : (
                    <span className="text-zinc-400">↕</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// 主组件：SearchFilter
// ============================================================================

export const SearchFilter = memo(function SearchFilter<T extends object>({
  items,
  filters = [],
  sorts = [],
  onResultsChange,
  showSort = true,
  showFilterCount = true,
  searchPlaceholder = '搜索...',
  _filterPlaceholder = '选择过滤器...',
  collapsible = false,
  defaultExpanded = true,
  className = '',
}: SearchFilterProps<T>) {
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [currentSort, setCurrentSort] = useState<SortConfig<T> | undefined>(
    sorts.length > 0 ? sorts[0] : undefined
  )
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // 处理过滤器选择变化
  const handleFilterChange = useCallback((filterId: string, values: unknown[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterId]: values,
    }))
  }, [])

  // 处理清除所有过滤器
  const handleClearAll = useCallback(() => {
    setActiveFilters(clearAllFilters())
    setQuery('')
  }, [])

  // 应用搜索、过滤、排序
  const results = useMemo(() => {
    return applySearchFilterSort(items, query, filters, activeFilters, currentSort)
  }, [items, query, filters, activeFilters, currentSort])

  // 通知父组件结果变化
  React.useEffect(() => {
    onResultsChange(results)
  }, [results, onResultsChange])

  const hasActiveFilter = hasActiveFilters(activeFilters)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 搜索框和操作栏 */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 搜索框 */}
        <div className="flex-1">
          <SearchBox query={query} onQueryChange={setQuery} placeholder={searchPlaceholder} />
        </div>

        {/* 排序 */}
        {showSort && sorts.length > 0 && (
          <SortDropdown
            sorts={sorts as SortConfig<unknown>[]}
            currentSort={currentSort as SortConfig<unknown> | undefined}
            onSortChange={setCurrentSort as (sort: SortConfig<unknown>) => void}
          />
        )}

        {/* 清除按钮 */}
        {(query || hasActiveFilter) && (
          <button
            onClick={handleClearAll}
            className="rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            清除
          </button>
        )}
      </div>

      {/* 过滤器区域 */}
      {filters.length > 0 && (
        <div className={`${collapsible ? (isExpanded ? 'block' : 'hidden') : 'block'}`}>
          {/* 过滤器折叠按钮 */}
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mb-3 flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <svg
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <span>过滤器</span>
              {showFilterCount && hasActiveFilter && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-xs text-white">
                  {Object.values(activeFilters).reduce(
                    (count, values) => count + (values?.length || 0),
                    0
                  )}
                </span>
              )}
            </button>
          )}

          {/* 过滤器下拉框列表 */}
          <div className="flex flex-wrap gap-2">
            {filters.map(filter => (
              <FilterDropdown
                key={filter.id}
                filter={filter as FilterConfig<unknown>}
                selectedValues={activeFilters[filter.id] || []}
                onSelectionChange={values => handleFilterChange(filter.id, values)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 结果统计 */}
      {showFilterCount && (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {query || hasActiveFilter
              ? `显示 ${results.filteredResults} / ${results.totalResults} 个结果`
              : `共 ${results.totalResults} 个项目`}
          </span>
          {(query || hasActiveFilter) && <span>{results.activeFilterCount} 个活动过滤器</span>}
        </div>
      )}
    </div>
  )
})
