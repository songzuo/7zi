/**
 * Smart Search - 搜索建议
 * 基于搜索历史、热门搜索、模糊匹配
 */

import { fuzzyMatch, fuzzyMatchItems, FuzzySearchOptions } from './fuzzy-search';

export interface SearchSuggestion {
  /** 建议文本 */
  text: string;
  /** 建议类型 */
  type: 'workflow' | 'task' | 'node' | 'history';
  /** 匹配分数 */
  score: number;
  /** 额外数据 */
  metadata?: Record<string, any>;
}

export interface SuggestionOptions extends FuzzySearchOptions {
  /** 是否包含历史记录 */
  includeHistory?: boolean;
  /** 是否包含热门搜索 */
  includePopular?: boolean;
  /** 最大建议数量 */
  limit?: number;
}

/**
 * 模拟工作流数据（实际应从 API 获取）
 */
const MOCK_WORKFLOWS = [
  { id: '1', name: '数据采集工作流', description: '从多个数据源采集数据' },
  { id: '2', name: '数据清洗工作流', description: '清洗和转换数据' },
  { id: '3', name: '数据分析工作流', description: '分析和可视化数据' },
  { id: '4', name: '报表生成工作流', description: '生成各类报表' },
  { id: '5', name: '邮件通知工作流', description: '发送邮件通知' }
];

/**
 * 模拟任务数据（实际应从 API 获取）
 */
const MOCK_TASKS = [
  { id: '1', name: '数据导入任务', status: 'pending' },
  { id: '2', name: '数据导出任务', status: 'running' },
  { id: '3', name: '模型训练任务', status: 'completed' },
  { id: '4', name: '模型预测任务', status: 'pending' },
  { id: '5', name: '数据备份任务', status: 'running' }
];

/**
 * 模拟节点数据（实际应从 API 获取）
 */
const MOCK_NODES = [
  { id: '1', name: '输入节点', type: 'input' },
  { id: '2', name: '处理节点', type: 'process' },
  { id: '3', name: '输出节点', type: 'output' },
  { id: '4', name: '条件节点', type: 'condition' },
  { id: '5', name: '循环节点', type: 'loop' }
];

/**
 * 热门搜索（静态数据）
 */
const POPULAR_SEARCHES = [
  '工作流',
  '任务',
  '节点',
  '数据分析',
  '数据采集',
  '数据清洗',
  '报表生成',
  '邮件通知'
];

/**
 * 搜索历史管理类
 */
class SearchHistoryManager {
  private readonly STORAGE_KEY = 'search-history-v1';
  private history: string[] = [];
  private maxHistorySize = 50;

  constructor() {
    if (typeof window !== 'undefined') {
      this.load();
    }
  }

  /**
   * 从 localStorage 加载历史记录
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      this.history = [];
    }
  }

  /**
   * 保存历史记录到 localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  /**
   * 添加搜索记录
   */
  add(query: string): void {
    if (!query || query.trim().length === 0) return;

    // 移除重复项
    this.history = this.history.filter((h) => h !== query);

    // 添加到开头
    this.history.unshift(query);

    // 限制大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.save();
  }

  /**
   * 获取最近的历史记录
   */
  getRecent(limit?: number): string[] {
    const size = limit || this.history.length;
    return this.history.slice(0, size);
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.save();
  }

  /**
   * 删除指定历史记录
   */
  remove(query: string): void {
    this.history = this.history.filter((h) => h !== query);
    this.save();
  }
}

// 单例实例
export const searchHistory = new SearchHistoryManager();

/**
 * 从工作流获取建议
 */
async function getWorkflowSuggestions(
  query: string,
  options: FuzzySearchOptions
): Promise<SearchSuggestion[]> {
  const results = fuzzyMatchItems(MOCK_WORKFLOWS, query, {
    ...options,
    getText: (wf) => wf.name
  });

  return results.map((r) => ({
    text: r.item.name,
    type: 'workflow' as const,
    score: r.score,
    metadata: {
      id: r.item.id,
      description: r.item.description
    }
  }));
}

/**
 * 从任务获取建议
 */
async function getTaskSuggestions(
  query: string,
  options: FuzzySearchOptions
): Promise<SearchSuggestion[]> {
  const results = fuzzyMatchItems(MOCK_TASKS, query, {
    ...options,
    getText: (task) => task.name
  });

  return results.map((r) => ({
    text: r.item.name,
    type: 'task' as const,
    score: r.score,
    metadata: {
      id: r.item.id,
      status: r.item.status
    }
  }));
}

/**
 * 从节点获取建议
 */
async function getNodeSuggestions(
  query: string,
  options: FuzzySearchOptions
): Promise<SearchSuggestion[]> {
  const results = fuzzyMatchItems(MOCK_NODES, query, {
    ...options,
    getText: (node) => node.name
  });

  return results.map((r) => ({
    text: r.item.name,
    type: 'node' as const,
    score: r.score,
    metadata: {
      id: r.item.id,
      nodeType: r.item.type
    }
  }));
}

/**
 * 从历史记录获取建议
 */
function getHistorySuggestions(
  query: string,
  options: FuzzySearchOptions
): SearchSuggestion[] {
  const recent = searchHistory.getRecent();
  const results = fuzzyMatchItems(
    recent.map((text) => ({ text })),
    query,
    options
  );

  return results.map((r) => ({
    text: r.item.text,
    type: 'history' as const,
    score: r.score
  }));
}

/**
 * 从热门搜索获取建议
 */
function getPopularSuggestions(
  query: string,
  options: FuzzySearchOptions
): SearchSuggestion[] {
  const results = fuzzyMatchItems(
    POPULAR_SEARCHES.map((text) => ({ text })),
    query,
    options
  );

  return results.map((r) => ({
    text: r.item.text,
    type: 'history' as const,
    score: r.score
  }));
}

/**
 * 获取搜索建议（主函数）
 * @param query 查询文本
 * @param options 可选配置
 * @returns 搜索建议数组
 */
export async function getSuggestions(
  query: string,
  options: SuggestionOptions = {}
): Promise<SearchSuggestion[]> {
  const {
    includeHistory = true,
    includePopular = true,
    limit = 10,
    ...searchOptions
  } = options;

  // 空查询返回热门搜索和历史记录
  if (!query || query.trim().length === 0) {
    const suggestions: SearchSuggestion[] = [];

    if (includeHistory) {
      const recent = searchHistory.getRecent(limit);
      recent.forEach((text, index) => {
        suggestions.push({
          text,
          type: 'history',
          score: 1 - index * 0.1 // 历史记录按时间降权
        });
      });
    }

    if (includePopular && suggestions.length < limit) {
      const remaining = limit - suggestions.length;
      POPULAR_SEARCHES.slice(0, remaining).forEach((text, index) => {
        suggestions.push({
          text,
          type: 'history',
          score: 0.9 - index * 0.05
        });
      });
    }

    return suggestions.slice(0, limit);
  }

  // 有查询时，从多个数据源获取建议
  const allSuggestions: SearchSuggestion[] = [];

  // 并行获取建议
  const [workflowSuggestions, taskSuggestions, nodeSuggestions] = await Promise.all([
    getWorkflowSuggestions(query, searchOptions),
    getTaskSuggestions(query, searchOptions),
    getNodeSuggestions(query, searchOptions)
  ]);

  allSuggestions.push(...workflowSuggestions);
  allSuggestions.push(...taskSuggestions);
  allSuggestions.push(...nodeSuggestions);

  // 添加历史记录建议
  if (includeHistory) {
    const historySuggestions = getHistorySuggestions(query, searchOptions);
    allSuggestions.push(...historySuggestions);
  }

  // 添加热门搜索建议
  if (includePopular) {
    const popularSuggestions = getPopularSuggestions(query, searchOptions);
    allSuggestions.push(...popularSuggestions);
  }

  // 按分数排序并去重
  const seen = new Set<string>();
  const filtered: SearchSuggestion[] = [];

  for (const suggestion of allSuggestions) {
    const key = `${suggestion.text}-${suggestion.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      filtered.push(suggestion);
    }
  }

  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, limit);
}

/**
 * 记录搜索（添加到历史记录）
 */
export function recordSearch(query: string): void {
  searchHistory.add(query);
}

/**
 * 清除搜索历史
 */
export function clearSearchHistory(): void {
  searchHistory.clear();
}

/**
 * 获取最近搜索
 */
export function getRecentSearches(limit?: number): string[] {
  return searchHistory.getRecent(limit);
}

/**
 * 删除指定搜索历史
 */
export function removeSearchHistory(query: string): void {
  searchHistory.remove(query);
}

/**
 * 获取热门搜索（静态数据）
 */
export function getPopularSearches(): string[] {
  return [...POPULAR_SEARCHES];
}

/**
 * 更新模拟数据（用于测试）
 */
export function updateMockData({
  workflows,
  tasks,
  nodes
}: {
  workflows?: any[];
  tasks?: any[];
  nodes?: any[];
}): void {
  // 在实际应用中，这些数据应该从 API 获取
  // 这里只是为了演示方便
  if (workflows) (MOCK_WORKFLOWS as any) = workflows;
  if (tasks) (MOCK_TASKS as any) = tasks;
  if (nodes) (MOCK_NODES as any) = nodes;
}
