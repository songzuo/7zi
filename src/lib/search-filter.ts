/**
 * @fileoverview 搜索与过滤工具函数
 * @description 提供通用的搜索、过滤、排序功能
 */

import type {
  SearchConfig,
  SearchResult,
  FilterConfig,
  FilterOption,
  SortConfig,
  ActiveFilters,
  SearchFilterResult,
} from '@/types/search-filter';

// ============================================================================
// 搜索工具函数
// ============================================================================

/**
 * 执行文本搜索
 * @param items 要搜索的项目列表
 * @param query 搜索关键词
 * @param config 搜索配置
 * @returns 搜索结果列表
 */
export function searchItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  config: SearchConfig = { target: 'all' }
): SearchResult<T>[] {
  if (!query.trim()) {
    return items.map(item => ({
      item,
      matchedFields: [],
      highlights: [],
      score: 1,
    }));
  }

  const results: SearchResult<T>[] = [];
  const searchFields = config.fields || Object.keys(items[0] || {});
  const caseSensitive = config.caseSensitive || false;
  const exactMatch = config.exactMatch || false;

  for (const item of items) {
    const matchedFields: string[] = [];
    const highlights: SearchResult['highlights'] = [];
    let totalScore = 0;

    for (const field of searchFields) {
      const value = item[field];

      if (typeof value !== 'string') continue;

      const text = caseSensitive ? value : value.toLowerCase();
      const searchQuery = caseSensitive ? query : query.toLowerCase();

      // 检查匹配
      let match = false;
      let score = 0;
      let start = -1;
      let end = -1;

      if (exactMatch) {
        if (text === searchQuery) {
          match = true;
          score = 2;
          start = 0;
          end = value.length;
        }
      } else {
        const index = text.indexOf(searchQuery);
        if (index !== -1) {
          match = true;
          score = 1 + (1 - index / text.length) * 0.5; // 位置越靠前分数越高
          start = index;
          end = index + searchQuery.length;
        }
      }

      if (match) {
        matchedFields.push(field);
        totalScore += score;
        highlights.push({
          field,
          text: value.substring(start - 20, end + 20).replace(/^\S*\s*/, '').replace(/\s*\S*$/, ''),
          start,
          end,
        });
      }
    }

    if (matchedFields.length > 0) {
      results.push({
        item,
        matchedFields,
        highlights,
        score: totalScore,
      });
    }
  }

  // 按相关性分数排序
  return results.sort((a, b) => b.score - a.score);
}

/**
 * 高亮搜索关键词
 * @param text 原始文本
 * @param query 搜索关键词
 * @param caseSensitive 是否区分大小写
 * @returns 包含高亮标记的 HTML 字符串
 */
export function highlightSearchTerm(
  text: string,
  query: string,
  caseSensitive = false
): string {
  if (!query.trim()) return text;

  const searchQuery = caseSensitive ? query : query.toLowerCase();
  const searchText = caseSensitive ? text : text.toLowerCase();
  const index = searchText.indexOf(searchQuery);

  if (index === -1) return text;

  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);

  return `${before}<mark class="bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded">${match}</mark>${after}`;
}

// ============================================================================
// 过滤工具函数
// ============================================================================

/**
 * 应用过滤条件到项目列表
 * @param items 要过滤的项目列表
 * @param filters 过滤器配置
 * @param activeFilters 活动的过滤器状态
 * @returns 过滤后的项目列表
 */
export function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  filters: FilterConfig<T>[],
  activeFilters: ActiveFilters<T>
): T[] {
  let filtered = [...items];

  for (const filter of filters) {
    if (!filter.enabled && filter.enabled !== undefined) continue;

    const selectedValues = activeFilters[filter.id];
    if (!selectedValues || selectedValues.length === 0) continue;

    if (filter.customFilter) {
      // 使用自定义过滤函数
      filtered = filtered.filter(item => filter.customFilter!(item, selectedValues));
    } else {
      // 使用默认过滤逻辑
      filtered = filtered.filter(item => {
        const fieldValue = item[filter.id as keyof T];
        return selectedValues.includes(fieldValue);
      });
    }
  }

  return filtered;
}

/**
 * 从项目中提取过滤器选项
 * @param items 项目列表
 * @param field 字段名
 * @returns 过滤器选项列表
 */
export function extractFilterOptions<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T
): FilterOption[] {
  const uniqueValues = new Map<unknown, number>();

  // 统计每个值的出现次数
  for (const item of items) {
    const value = item[field];
    if (value === null || value === undefined) continue;

    const count = uniqueValues.get(value) || 0;
    uniqueValues.set(value, count + 1);
  }

  // 转换为 FilterOption 数组
  return Array.from(uniqueValues.entries()).map(([value, count]) => ({
    value,
    label: String(value),
    count,
  }));
}

/**
 * 从 GitHub Issues 中提取标签选项
 * @param issues GitHub Issues 列表
 * @returns 标签过滤器选项列表
 */
export function extractLabelOptions(issues: Array<{ labels?: Array<{ name: string; color: string }> }>): FilterOption[] {
  const labelCounts = new Map<string, { color: string; count: number }>();

  // 统计每个标签的出现次数
  for (const issue of issues) {
    if (!issue.labels) continue;

    for (const label of issue.labels) {
      const existing = labelCounts.get(label.name);
      if (existing) {
        existing.count++;
      } else {
        labelCounts.set(label.name, {
          color: label.color,
          count: 1,
        });
      }
    }
  }

  // 转换为 FilterOption 数组
  return Array.from(labelCounts.entries())
    .map(([name, { color, count }]) => ({
      value: name,
      label: name,
      color: `#${color}`,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 从 GitHub Issues 中提取分配者选项
 * @param issues GitHub Issues 列表
 * @returns 分配者过滤器选项列表
 */
export function extractAssigneeOptions(
  issues: Array<{ assignee?: { login: string; avatar_url: string } | null }>
): FilterOption[] {
  const assigneeCounts = new Map<string, { avatar_url: string; count: number }>();

  // 统计每个分配者的出现次数
  for (const issue of issues) {
    if (!issue.assignee) continue;

    const login = issue.assignee.login;
    const existing = assigneeCounts.get(login);
    if (existing) {
      existing.count++;
    } else {
      assigneeCounts.set(login, {
        avatar_url: issue.assignee.avatar_url,
        count: 1,
      });
    }
  }

  // 转换为 FilterOption 数组
  return Array.from(assigneeCounts.entries())
    .map(([login, { avatar_url, count }]) => ({
      value: login,
      label: login,
      icon: avatar_url,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// 排序工具函数
// ============================================================================

/**
 * 应用排序到项目列表
 * @param items 要排序的项目列表
 * @param sortConfig 排序配置
 * @returns 排序后的项目列表
 */
export function applySort<T extends Record<string, unknown>>(
  items: T[],
  sortConfig: SortConfig<T>
): T[] {
  const sorted = [...items];

  if (sortConfig.comparator) {
    // 使用自定义比较函数
    return sorted.sort(sortConfig.comparator);
  }

  // 默认排序逻辑
  return sorted.sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (aValue === bValue) return 0;

    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    return sortConfig.direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * 切换排序方向
 * @param direction 当前排序方向
 * @returns 新的排序方向
 */
export function toggleSortDirection(direction: 'asc' | 'desc'): 'asc' | 'desc' {
  return direction === 'asc' ? 'desc' : 'asc';
}

// ============================================================================
// 综合搜索过滤工具函数
// ============================================================================

/**
 * 应用搜索、过滤、排序到项目列表
 * @param items 项目列表
 * @param query 搜索关键词
 * @param filters 过滤器配置
 * @param activeFilters 活动的过滤器状态
 * @param sortConfig 排序配置
 * @param searchConfig 搜索配置
 * @returns 搜索过滤结果
 */
export function applySearchFilterSort<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  filters: FilterConfig<T>[],
  activeFilters: ActiveFilters<T>,
  sortConfig?: SortConfig<T>,
  searchConfig?: SearchConfig
): SearchFilterResult<T> {
  // 1. 应用过滤
  const filtered = applyFilters(items, filters, activeFilters);

  // 2. 应用搜索
  const searchResults = searchItems(filtered, query, searchConfig);
  const searched = searchResults.map(r => r.item);

  // 3. 应用排序
  const sorted = sortConfig ? applySort(searched, sortConfig) : searched;

  // 4. 计算活动过滤器数量
  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, values) => count + (values?.length || 0),
    0
  );

  return {
    items: sorted,
    searchResults: query.trim() ? searchResults : undefined,
    activeFilterCount,
    totalResults: items.length,
    filteredResults: sorted.length,
  };
}

/**
 * 检查是否有活动过滤器
 * @param activeFilters 活动的过滤器状态
 * @returns 是否有活动过滤器
 */
export function hasActiveFilters(activeFilters: ActiveFilters): boolean {
  return Object.values(activeFilters).some(values => values && values.length > 0);
}

/**
 * 清除所有过滤器
 * @returns 空的过滤器状态
 */
export function clearAllFilters(): ActiveFilters {
  return {};
}
