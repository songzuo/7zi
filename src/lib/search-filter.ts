/**
 * @fileoverview 搜索与过滤工具函数（性能优化版）
 * @description 提供通用的搜索、过滤、排序功能，包含缓存和性能优化
 * @features 模糊匹配、拼音搜索、相关性评分
 */

import type {
  SearchConfig,
  SearchResult,
  FilterConfig,
  FilterOption,
  SortConfig,
  ActiveFilters,
  SearchFilterResult,
} from '@/types/search-filter'
import { LRUCache } from '@/lib/cache/lru-cache'

// ============================================================================
// 缓存工具
// ============================================================================

/**
 * Unified cache instance (using generic storage)
 * We use unknown instead of any for better type safety
 */
const unifiedCache = new LRUCache<unknown>(100)

/**
 * 生成搜索缓存键
 */
function generateSearchKey<T>(items: T[], query: string, config: SearchConfig): string {
  const fieldsStr = config.fields?.join(',') || 'all'
  const fieldWeights = config.fieldWeights ? JSON.stringify(config.fieldWeights) : ''
  return `${query}-${config.caseSensitive}-${config.exactMatch}-${config.fuzzyMatch || false}-${config.fuzzyThreshold || 1}-${config.pinyinMatch || false}-${fieldWeights}-${fieldsStr}-${items.length}-${query.length}`
}

/**
 * 生成排序缓存键
 */
function generateSortKey<T>(items: T[], config: SortConfig<T>): string {
  return `${String(config.field)}-${config.direction}-${items.length}-${items[0] ? JSON.stringify(items[0]) : ''}`
}

/**
 * 通用的选项提取函数（减少重复代码）
 */
function extractOptions<T>(
  items: T[],
  extractor: (item: T) => string | null,
  decorator?: (value: string, count: number, item: T) => Record<string, unknown>
): FilterOption[] {
  // 早期退出
  if (items.length === 0) {
    return []
  }

  const uniqueValues = new Map<string, { count: number; firstItem: T }>()

  // 统计每个值的出现次数
  for (const item of items) {
    const value = extractor(item)
    if (value === null) continue

    const existing = uniqueValues.get(value)
    if (existing) {
      existing.count++
    } else {
      uniqueValues.set(value, { count: 1, firstItem: item })
    }
  }

  // 转换为 FilterOption 数组并排序
  return Array.from(uniqueValues.entries())
    .map(([value, { count, firstItem }]) => {
      const base = { value, label: value, count }
      return decorator ? { ...base, ...decorator(value, count, firstItem) } : base
    })
    .sort((a, b) => b.count - a.count)
}

// ============================================================================
// 模糊匹配工具函数
// ============================================================================

/**
 * 计算两个字符串的 Levenshtein 距离（编辑距离）
 * @param a 第一个字符串
 * @param b 第二个字符串
 * @returns 编辑距离
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // 初始化矩阵
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // 填充矩阵
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 删除
        matrix[i][j - 1] + 1, // 插入
        matrix[i - 1][j - 1] + cost // 替换
      )
    }
  }

  return matrix[b.length][a.length]
}

/**
 * 模糊匹配检查
 * @param text 目标文本
 * @param query 搜索查询
 * @param threshold 最大编辑距离（默认1）
 * @returns 匹配结果：是否匹配、分数、起始位置
 */
function fuzzyMatch(
  text: string,
  query: string,
  threshold = 1
): {
  match: boolean
  score: number
  start: number
} {
  if (query.length === 0) {
    return { match: true, score: 1, start: 0 }
  }

  if (query.length > text.length) {
    return { match: false, score: 0, start: -1 }
  }

  // 优化：先检查子串匹配（最快路径）
  const index = text.indexOf(query)
  if (index !== -1) {
    // 精确子串匹配，分数最高
    return {
      match: true,
      score: 1 + (1 - index / text.length) * 0.3,
      start: index,
    }
  }

  // 计算编辑距离
  const distance = levenshteinDistance(text, query)

  // 动态调整阈值：较长的查询允许更大的编辑距离
  const dynamicThreshold = Math.min(threshold, Math.floor(query.length / 3))

  if (distance <= dynamicThreshold) {
    // 基于编辑距离计算分数
    const score = Math.max(0, 1 - distance / Math.max(text.length, query.length))
    return { match: true, score, start: 0 }
  }

  return { match: false, score: 0, start: -1 }
}

/**
 * 检查字符串是否是拼音
 * @param str 要检查的字符串
 * @returns 是否是纯拼音
 */
function isPinyin(str: string): boolean {
  return /^[a-zA-Z\s]+$/.test(str) && str.length <= 20
}

/**
 * 简化的拼音映射表（常用汉字）
 * 实际生产环境应使用完整的拼音库（如 pinyin-engine）
 */
const PINYIN_MAP: Record<string, string[]> = {
  中: ['zhong'],
  文: ['wen'],
  项: ['xiang'],
  目: ['mu'],
  任: ['ren'],
  务: ['wu'],
  状: ['zhuang'],
  态: ['tai'],
  优: ['you'],
  先: ['xian'],
  级: ['ji'],
  低: ['di'],
  分: ['fen'],
  配: ['pei'],
  者: ['zhe'],
  标: ['biao'],
  签: ['qian'],
  创: ['chuang'],
  建: ['jian'],
  完: ['wan'],
  成: ['cheng'],
  进: ['jin'],
  行: ['xing'],
  开: ['kai'],
  启: ['qi'],
  关: ['guan'],
  闭: ['bi'],
  删: ['shan'],
  除: ['chu'],
  修: ['xiu'],
  改: ['gai'],
  查: ['cha'],
  看: ['kan'],
  显: ['xian'],
  示: ['shi'],
  隐: ['yin'],
  藏: ['cang'],
  编: ['bian'],
  辑: ['ji'],
  保: ['bao'],
  存: ['cun'],
  取: ['qu'],
  消: ['xiao'],
  确: ['que'],
  定: ['ding'],
  // 可以根据需要添加更多汉字
}

/**
 * 将中文字符串转换为拼音字符串
 * @param text 中文文本
 * @returns 拼音字符串
 */
function toPinyin(text: string): string {
  let result = ''
  for (const char of text) {
    const pinyins = PINYIN_MAP[char]
    if (pinyins) {
      result += pinyins[0] + ' '
    } else {
      result += char + ' '
    }
  }
  return result.trim()
}

/**
 * 拼音模糊匹配
 * @param text 目标中文文本
 * @param query 拼音查询
 * @returns 匹配结果
 */
function pinyinMatch(
  text: string,
  query: string
): {
  match: boolean
  score: number
  start: number
} {
  // 检查是否是拼音查询
  if (!isPinyin(query)) {
    return { match: false, score: 0, start: -1 }
  }

  // 将文本转换为拼音
  const textPinyin = toPinyin(text).toLowerCase()
  const queryPinyin = query.toLowerCase()

  // 在拼音中查找
  const index = textPinyin.indexOf(queryPinyin)
  if (index !== -1) {
    return {
      match: true,
      score: 0.8 + (1 - index / textPinyin.length) * 0.2, // 拼音匹配分数略低于精确匹配
      start: Math.floor(index / 2), // 粗略估计原始位置
    }
  }

  // 尝试模糊拼音匹配
  return fuzzyMatch(textPinyin, queryPinyin, 1)
}

// ============================================================================
// 搜索工具函数
// ============================================================================

/**
 * 执行文本搜索（带缓存、模糊匹配、拼音支持）
 * @param items 要搜索的项目列表
 * @param query 搜索关键词
 * @param config 搜索配置
 * @returns 搜索结果列表
 */
export function searchItems<T extends object>(
  items: T[],
  query: string,
  config: SearchConfig = { target: 'all' }
): SearchResult<T>[] {
  // 早期退出：空查询或空数组
  if (!query.trim()) {
    return items.map(item => ({
      item,
      matchedFields: [],
      highlights: [],
      score: 1,
    }))
  }

  if (items.length === 0) {
    return []
  }

  // 检查缓存
  const cacheKey = generateSearchKey(items, query, config)
  const cached = unifiedCache.get(cacheKey) as SearchResult<T>[] | undefined
  if (cached) {
    return cached
  }

  const results: SearchResult<T>[] = []
  // Add null safety check for empty arrays
  const searchFields = config.fields || (items.length > 0 ? Object.keys(items[0] as object) : [])
  const caseSensitive = config.caseSensitive || false
  const exactMatch = config.exactMatch || false
  const enableFuzzyMatch = config.fuzzyMatch || false
  const fuzzyThreshold = config.fuzzyThreshold ?? 1
  const enablePinyinMatch = config.pinyinMatch || false
  const fieldWeights = config.fieldWeights || {}
  const includeHighlights = config.includeHighlights !== false
  const minScore = config.minScore ?? 0

  // 预处理搜索查询（仅在非大小写敏感时转换为小写）
  const searchQuery = caseSensitive ? query : query.toLowerCase()

  for (const item of items) {
    const matchedFields: string[] = []
    const highlights: SearchResult['highlights'] = []
    let totalScore = 0

    for (const field of searchFields) {
      const value = (item as Record<string, unknown>)[field]

      if (typeof value !== 'string') continue

      const text = caseSensitive ? value : value.toLowerCase()
      const weight = fieldWeights[field] || 1

      // 检查匹配
      let match = false
      let score = 0
      let start = -1
      let end = -1
      let matchType = ''

      // 1. 完全匹配（最高优先级）
      if (exactMatch) {
        if (text === searchQuery) {
          match = true
          score = 3 * weight // 完全匹配得高分
          matchType = 'exact'
          start = 0
          end = value.length
        }
      } else {
        // 2. 精确子串匹配
        const index = text.indexOf(searchQuery)
        if (index !== -1) {
          match = true
          // Use position-based scoring: matches at the beginning get higher scores
          // Absolute position is more important than relative position
          // Score: 2.5 at position 0, decreasing by 0.1 for each position
          score = (2.5 - index * 0.05) * weight
          // Cap minimum score at 1.0
          score = Math.max(score, 1.0)
          matchType = 'substring'
          start = index
          end = index + searchQuery.length
        }
        // 3. 模糊匹配
        else if (enableFuzzyMatch) {
          const fuzzyResult = fuzzyMatch(text, searchQuery, fuzzyThreshold)
          if (fuzzyResult.match) {
            match = true
            score = fuzzyResult.score * weight * 0.8 // 模糊匹配分数略低
            matchType = 'fuzzy'
            start = fuzzyResult.start
            end = fuzzyResult.start + searchQuery.length
          }
        }

        // 4. 拼音匹配
        if (!match && enablePinyinMatch) {
          const pinyinResult = pinyinMatch(caseSensitive ? value : value.toLowerCase(), query)
          if (pinyinResult.match) {
            match = true
            score = pinyinResult.score * weight * 0.7 // 拼音匹配分数更低
            matchType = 'pinyin'
            start = pinyinResult.start
            end = Math.min(pinyinResult.start + searchQuery.length * 2, value.length)
          }
        }
      }

      if (match) {
        matchedFields.push(field)
        totalScore += score

        // 生成高亮（如果启用）
        if (includeHighlights && start >= 0) {
          highlights.push({
            field,
            text: value
              .substring(Math.max(0, start - 20), Math.min(value.length, end + 20))
              .replace(/^\S*\s*/, '')
              .replace(/\s*\S*$/, ''),
            start: Math.max(0, start),
            end: Math.min(value.length, end),
          })
        }
      }
    }

    // 应用最低分数阈值
    if (matchedFields.length > 0 && totalScore >= minScore) {
      results.push({
        item,
        matchedFields,
        highlights,
        score: totalScore,
      })
    }
  }

  // 按相关性分数排序（原地排序）
  results.sort((a, b) => b.score - a.score)

  // 缓存结果
  unifiedCache.set(cacheKey, results)

  return results
}

/**
 * 高亮搜索关键词（支持模糊匹配和拼音）
 * @param text 原始文本
 * @param query 搜索关键词
 * @param config 搜索配置
 * @returns 包含高亮标记的 HTML 字符串
 */
export function highlightSearchTerm(
  text: string,
  query: string,
  config: Partial<SearchConfig> = {}
): string {
  // 早期退出
  if (!query.trim()) return text

  const caseSensitive = config.caseSensitive || false
  const enableFuzzyMatch = config.fuzzyMatch || false
  const fuzzyThreshold = config.fuzzyThreshold ?? 1
  const enablePinyinMatch = config.pinyinMatch || false

  const searchQuery = caseSensitive ? query : query.toLowerCase()
  const searchText = caseSensitive ? text : text.toLowerCase()

  // 1. 尝试精确匹配
  const index = searchText.indexOf(searchQuery)
  if (index !== -1) {
    const before = text.substring(0, index)
    const match = text.substring(index, index + query.length)
    const after = text.substring(index + query.length)
    return `${before}<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">${match}</mark>${after}`
  }

  // 2. 尝试模糊匹配
  if (enableFuzzyMatch) {
    const fuzzyResult = fuzzyMatch(searchText, searchQuery, fuzzyThreshold)
    if (fuzzyResult.match) {
      // 对于模糊匹配，高亮最可能的位置
      const start = Math.max(0, fuzzyResult.start)
      const end = Math.min(text.length, start + query.length)
      const before = text.substring(0, start)
      const match = text.substring(start, end)
      const after = text.substring(end)
      return `${before}<mark class="bg-orange-200 dark:bg-orange-700 px-0.5 rounded">${match}</mark>${after}`
    }
  }

  // 3. 尝试拼音匹配
  if (enablePinyinMatch && isPinyin(query)) {
    const textPinyin = toPinyin(caseSensitive ? text : text.toLowerCase())
    const queryPinyin = searchQuery
    const pinyinIndex = textPinyin.indexOf(queryPinyin)
    if (pinyinIndex !== -1) {
      // 粗略估计原始位置
      const estimatedStart = Math.floor(pinyinIndex / 2)
      const estimatedEnd = Math.min(text.length, estimatedStart + query.length * 2)
      const before = text.substring(0, estimatedStart)
      const match = text.substring(estimatedStart, estimatedEnd)
      const after = text.substring(estimatedEnd)
      return `${before}<mark class="bg-blue-200 dark:bg-blue-700 px-0.5 rounded">${match}</mark>${after}`
    }
  }

  // 没有匹配，返回原始文本
  return text
}

// ============================================================================
// 过滤工具函数
// ============================================================================

/**
 * 应用过滤条件到项目列表（优化版）
 * @param items 要过滤的项目列表
 * @param filters 过滤器配置
 * @param activeFilters 活动的过滤器状态
 * @returns 过滤后的项目列表
 */
export function applyFilters<T extends object>(
  items: T[],
  filters: FilterConfig<T>[],
  activeFilters: ActiveFilters<T>
): T[] {
  // 早期退出：没有活动过滤器
  if (!hasActiveFilters(activeFilters)) {
    return items
  }

  // 早期退出：空数组
  if (items.length === 0) {
    return []
  }

  // 预处理：将选中的值转换为 Set 以获得 O(1) 查找
  const activeFilterSets = new Map<FilterConfig<T>, Set<unknown>>()
  let hasEnabledFilter = false

  for (const filter of filters) {
    if (filter.enabled === false) continue

    const selectedValues = activeFilters[filter.id]
    if (!selectedValues || selectedValues.length === 0) continue

    // 使用 Set 优化查找性能
    activeFilterSets.set(filter, new Set(selectedValues))
    hasEnabledFilter = true
  }

  // 早期退出：没有启用的过滤器
  if (!hasEnabledFilter) {
    return items
  }

  // 单次遍历优化：在一次遍历中应用所有过滤器
  const filtered: T[] = []

  for (const item of items) {
    let passesAllFilters = true

    for (const [filter, valuesSet] of activeFilterSets.entries()) {
      if (filter.customFilter) {
        // 使用自定义过滤函数
        if (!filter.customFilter(item, Array.from(valuesSet))) {
          passesAllFilters = false
          break // 早期退出：不通过当前过滤器
        }
      } else {
        // 使用默认过滤逻辑
        const fieldValue = (item as Record<string, unknown>)[filter.id]
        if (!valuesSet.has(fieldValue)) {
          passesAllFilters = false
          break // 早期退出：不通过当前过滤器
        }
      }
    }

    if (passesAllFilters) {
      filtered.push(item)
    }
  }

  return filtered
}

/**
 * 从项目中提取过滤器选项（带缓存）
 * @param items 项目列表
 * @param field 字段名
 * @returns 过滤器选项列表
 */
export function extractFilterOptions<T extends object>(items: T[], field: keyof T): FilterOption[] {
  // 早期退出
  if (items.length === 0) {
    return []
  }

  // 检查缓存
  const cacheKey = `options-${String(field)}-${items.length}`
  const cached = unifiedCache.get(cacheKey) as FilterOption[] | undefined
  if (cached) {
    return cached
  }

  const options = extractOptions(items, item => {
    const value = (item as Record<string, unknown>)[String(field)]
    return value === null || value === undefined ? null : String(value)
  })

  // 缓存结果
  unifiedCache.set(cacheKey, options)

  return options
}

/**
 * 从 GitHub Issues 中提取标签选项（带缓存）
 * @param issues GitHub Issues 列表
 * @returns 标签过滤器选项列表
 */
export function extractLabelOptions(
  issues: Array<{ labels?: Array<{ name: string; color: string }> }>
): FilterOption[] {
  // 早期退出
  if (issues.length === 0) {
    return []
  }

  // 检查缓存
  const cacheKey = `labels-${issues.length}`
  const cached = unifiedCache.get(cacheKey) as FilterOption[] | undefined
  if (cached) {
    return cached
  }

  // Flatten all labels from all issues
  const allLabels: Array<{ name: string; color: string }> = []
  for (const issue of issues) {
    if (issue.labels) {
      allLabels.push(...issue.labels)
    }
  }

  const uniqueValues = new Map<string, { count: number; color: string }>()

  for (const label of allLabels) {
    const existing = uniqueValues.get(label.name)
    if (existing) {
      existing.count++
    } else {
      uniqueValues.set(label.name, { count: 1, color: label.color })
    }
  }

  const options = Array.from(uniqueValues.entries())
    .map(([value, { count, color }]) => ({
      value,
      label: value,
      count,
      color: `#${color}`,
    }))
    .sort((a, b) => b.count - a.count)

  // 缓存结果
  unifiedCache.set(cacheKey, options)

  return options
}

/**
 * 从 GitHub Issues 中提取分配者选项（带缓存）
 * @param issues GitHub Issues 列表
 * @returns 分配者过滤器选项列表
 */
export function extractAssigneeOptions(
  issues: Array<{ assignee?: { login: string; avatar_url: string } | null }>
): FilterOption[] {
  // 早期退出
  if (issues.length === 0) {
    return []
  }

  // 检查缓存
  const cacheKey = `assignees-${issues.length}`
  const cached = unifiedCache.get(cacheKey) as FilterOption[] | undefined
  if (cached) {
    return cached
  }

  const options = extractOptions(
    issues,
    issue => issue.assignee?.login || null,
    (login, count, issue) => ({
      icon: issue.assignee?.avatar_url,
    })
  )

  // 缓存结果
  unifiedCache.set(cacheKey, options)

  return options
}

// ============================================================================
// 排序工具函数
// ============================================================================

/**
 * 应用排序到项目列表（带缓存）
 * @param items 要排序的项目列表
 * @param sortConfig 排序配置
 * @returns 排序后的项目列表
 */
export function applySort<T extends object>(items: T[], sortConfig: SortConfig<T>): T[] {
  // 早期退出
  if (items.length <= 1) {
    return [...items]
  }

  // 检查缓存（仅当使用自定义比较器时）
  if (sortConfig.comparator) {
    // 自定义比较器不缓存（因为可能包含闭包）
    const sorted = [...items]
    return sorted.sort(sortConfig.comparator)
  }

  // 检查缓存（仅对默认排序）
  const cacheKey = generateSortKey(items, sortConfig)
  const cached = unifiedCache.get(cacheKey) as T[] | undefined
  if (cached) {
    return cached
  }

  const sorted = [...items]

  // 默认排序逻辑
  sorted.sort((a, b) => {
    const aValue = (a as Record<string, unknown>)[String(sortConfig.field)]
    const bValue = (b as Record<string, unknown>)[String(sortConfig.field)]

    if (aValue === bValue) return 0
    if (aValue == null) return 1
    if (bValue == null) return -1

    // 将值转换为字符串进行统一比较
    const aStr = String(aValue)
    const bStr = String(bValue)

    let comparison = 0
    if (aStr < bStr) {
      comparison = -1
    } else if (aStr > bStr) {
      comparison = 1
    }

    return sortConfig.direction === 'desc' ? -comparison : comparison
  })

  // 缓存结果
  unifiedCache.set(cacheKey, sorted)

  return sorted
}

/**
 * 切换排序方向
 * @param direction 当前排序方向
 * @returns 新的排序方向
 */
export function toggleSortDirection(direction: 'asc' | 'desc'): 'asc' | 'desc' {
  return direction === 'asc' ? 'desc' : 'asc'
}

// ============================================================================
// 综合搜索过滤工具函数
// ============================================================================

/**
 * 应用搜索、过滤、排序到项目列表（优化版）
 * @param items 项目列表
 * @param query 搜索关键词
 * @param filters 过滤器配置
 * @param activeFilters 活动的过滤器状态
 * @param sortConfig 排序配置
 * @param searchConfig 搜索配置
 * @returns 搜索过滤结果
 */
export function applySearchFilterSort<T extends object>(
  items: T[],
  query: string,
  filters: FilterConfig<T>[],
  activeFilters: ActiveFilters<T>,
  sortConfig?: SortConfig<T>,
  searchConfig?: SearchConfig
): SearchFilterResult<T> {
  // 早期退出：空数组
  if (items.length === 0) {
    return {
      items: [],
      searchResults: undefined,
      activeFilterCount: 0,
      totalResults: 0,
      filteredResults: 0,
    }
  }

  // 1. 应用过滤
  const filtered = applyFilters(items, filters, activeFilters)

  // 2. 应用搜索
  const searchResults = searchItems(filtered, query, searchConfig)
  const searched = searchResults.map(r => r.item)

  // 3. 应用排序（仅在需要时）
  const sorted = sortConfig ? applySort(searched, sortConfig) : searched

  // 4. 计算活动过滤器数量（早期退出优化）
  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, values) => count + (values?.length || 0),
    0
  )

  return {
    items: sorted,
    searchResults: query.trim() ? searchResults : undefined,
    activeFilterCount,
    totalResults: items.length,
    filteredResults: sorted.length,
  }
}

/**
 * 检查是否有活动过滤器（优化版）
 * @param activeFilters 活动的过滤器状态
 * @returns 是否有活动过滤器
 */
export function hasActiveFilters(activeFilters: ActiveFilters): boolean {
  // 早期退出：空对象、null 或 undefined
  if (!activeFilters) {
    return false
  }

  const keys = Object.keys(activeFilters)
  if (keys.length === 0) {
    return false
  }

  // 早期退出：检查第一个非空值
  for (const key of keys) {
    const values = activeFilters[key]
    if (values && values.length > 0) {
      return true
    }
  }

  return false
}

/**
 * 清除所有过滤器
 * @returns 空的过滤器状态
 */
export function clearAllFilters(): ActiveFilters {
  return {}
}

/**
 * 清除所有缓存
 * 用于内存管理或数据更新后
 */
export function clearAllCaches(): void {
  unifiedCache.clear()
}

/**
 * 获取缓存统计信息
 * 用于性能监控
 */
export function getCacheStats(): {
  total: number
} {
  return {
    total: unifiedCache.size,
  }
}
