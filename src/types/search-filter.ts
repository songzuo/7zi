/**
 * @fileoverview 搜索与过滤功能的类型定义
 * @description 统一管理搜索、过滤、排序相关的类型
 */

import type { GitHubIssue } from './common'

// ============================================================================
// 搜索相关类型
// ============================================================================

/**
 * 搜索目标类型
 */
export type SearchTarget = 'all' | 'tasks' | 'members' | 'projects'

/**
 * 搜索配置
 */
export interface SearchConfig {
  /** 搜索目标类型 */
  target: SearchTarget
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 是否完全匹配 */
  exactMatch?: boolean
  /** 搜索字段（可选，不指定则搜索所有字段） */
  fields?: string[]
  /** 是否启用模糊匹配（允许拼写错误） */
  fuzzyMatch?: boolean
  /** 模糊匹配的最大编辑距离（0-3，默认1） */
  fuzzyThreshold?: number
  /** 是否启用拼音模糊匹配（仅限中文） */
  pinyinMatch?: boolean
  /** 字段权重（用于相关性评分） */
  fieldWeights?: Record<string, number>
  /** 最低相关性分数阈值（0-1，低于此值的结果将被过滤） */
  minScore?: number
  /** 是否在结果中包含高亮 */
  includeHighlights?: boolean
}

/**
 * 搜索结果
 */
export interface SearchResult<T = unknown> {
  /** 匹配的项目 */
  item: T
  /** 匹配的字段 */
  matchedFields: string[]
  /** 匹配的文本片段（高亮显示） */
  highlights: {
    field: string
    text: string
    start: number
    end: number
  }[]
  /** 相关性分数 */
  score: number
}

// ============================================================================
// 过滤相关类型
// ============================================================================

/**
 * 过滤器类型
 */
export type FilterType = 'status' | 'priority' | 'assignee' | 'label' | 'date' | 'custom'

/**
 * 过滤器配置
 */
export interface FilterConfig<T = unknown> {
  /** 过滤器唯一标识 */
  id: string
  /** 过滤器类型 */
  type: FilterType
  /** 过滤器标签 */
  label: string
  /** 过滤器选项 */
  options: FilterOption<T>[]
  /** 是否多选 */
  multiple?: boolean
  /** 是否启用 */
  enabled?: boolean
  /** 自定义过滤函数 */
  customFilter?: (item: T, selectedValues: unknown[]) => boolean
}

/**
 * 过滤器选项
 */
export interface FilterOption<T = unknown> {
  /** 选项值 */
  value: unknown
  /** 选项标签 */
  label: string
  /** 选项图标 */
  icon?: string
  /** 选项颜色 */
  color?: string
  /** 选项描述 */
  description?: string
  /** 选项数量 */
  count?: number
}

/**
 * 活动过滤器状态
 */
export interface ActiveFilters<T = unknown> {
  /** 过滤器ID映射到选中的值 */
  [filterId: string]: unknown[]
}

// ============================================================================
// 排序相关类型
// ============================================================================

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc'

/**
 * 排序配置
 */
export interface SortConfig<T = unknown> {
  /** 排序字段 */
  field: keyof T
  /** 排序方向 */
  direction: SortDirection
  /** 自定义比较函数 */
  comparator?: (a: T, b: T) => number
}

// ============================================================================
// 任务特定的过滤类型
// ============================================================================

/**
 * 任务状态过滤器
 */
export type TaskStatusFilter = 'all' | 'open' | 'closed'

/**
 * 任务优先级过滤器
 */
export type TaskPriorityFilter = 'all' | 'high' | 'medium' | 'low'

/**
 * 任务标签过滤器
 */
export interface TaskLabelFilter {
  /** 标签名称 */
  name: string
  /** 标签颜色 */
  color: string
}

/**
 * 任务分配者过滤器
 */
export interface TaskAssigneeFilter {
  /** 分配者用户名 */
  login: string
  /** 分配者头像 */
  avatar_url: string
}

// ============================================================================
// 搜索过滤器组合类型
// ============================================================================

/**
 * 搜索过滤器状态
 */
export interface SearchFilterState<T = unknown> {
  /** 搜索关键词 */
  query: string
  /** 当前过滤条件 */
  filters: ActiveFilters<T>
  /** 当前排序 */
  sort?: SortConfig<T>
  /** 当前搜索目标 */
  target: SearchTarget
}

/**
 * 搜索过滤器结果
 */
export interface SearchFilterResult<T = unknown> {
  /** 过滤后的项目 */
  items: T[]
  /** 搜索结果详情（如果使用搜索） */
  searchResults?: SearchResult<T>[]
  /** 应用过滤器数量 */
  activeFilterCount: number
  /** 总结果数 */
  totalResults: number
  /** 过滤后的结果数 */
  filteredResults: number
}

// ============================================================================
// GitHub Issues 特定的搜索过滤器类型
// ============================================================================

/**
 * GitHub Issues 搜索过滤器状态
 */
export interface IssueSearchFilterState extends SearchFilterState<GitHubIssue> {
  /** 状态过滤器 */
  status?: TaskStatusFilter
  /** 标签过滤器 */
  labels?: string[]
  /** 分配者过滤器 */
  assignees?: string[]
}

/**
 * GitHub Issues 过滤器配置预设
 */
export const ISSUE_FILTER_CONFIGS: FilterConfig<GitHubIssue>[] = [
  {
    id: 'status',
    type: 'status',
    label: '状态',
    multiple: false,
    options: [
      { value: 'all', label: '全部', icon: '📋' },
      { value: 'open', label: '进行中', icon: '🟢', color: 'green' },
      { value: 'closed', label: '已完成', icon: '✅', color: 'gray' },
    ],
  },
  {
    id: 'labels',
    type: 'label',
    label: '标签',
    multiple: true,
    options: [], // 动态填充
  },
  {
    id: 'assignees',
    type: 'assignee',
    label: '分配者',
    multiple: true,
    options: [], // 动态填充
  },
]

/**
 * GitHub Issues 排序配置预设
 */
export const ISSUE_SORT_CONFIGS: SortConfig<GitHubIssue>[] = [
  {
    field: 'number',
    direction: 'desc',
  },
  {
    field: 'created_at',
    direction: 'desc',
  },
  {
    field: 'updated_at',
    direction: 'desc',
  },
]
