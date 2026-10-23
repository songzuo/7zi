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
  metadata?: Record<string, unknown>;
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
interface MockWorkflow {
  id: string;
  name: string;
  description?: string;
  text?: string;
}

interface MockTask {
  id: string;
  name: string;
  status?: string;
  text?: string;
}

interface MockNode {
  id: string;
  name: string;
  type?: string;
  text?: string;
}

const MOCK_WORKFLOWS: MockWorkflow[] = [
  { id: '1', name: '数据采集工作流', description: '从多个数据源采集数据', text: 'workflow data collection' },
  { id: '2', name: '数据清洗工作流', description: '清洗和转换数据', text: 'workflow data cleaning' },
  { id: '3', name: '数据分析工作流', description: '分析和可视化数据', text: 'workflow data analysis' },
  { id: '4', name: '报表生成工作流', description: '生成各类报表', text: 'workflow report generation' },
  { id: '5', name: '邮件通知工作流', description: '发送邮件通知', text: 'workflow email notification' }
];

/**
 * 模拟任务数据（实际应从 API 获取）
 */
const MOCK_TASKS: MockTask[] = [
  { id: '1', name: '数据导入任务', status: 'pending', text: 'task data import' },
  { id: '2', name: '数据导出任务', status: 'running', text: 'task data export' },
  { id: '3', name: '模型训练任务', status: 'completed', text: 'task model training' },
  { id: '4', name: '模型预测任务', status: 'pending', text: 'task model prediction' },
  { id: '5', name: '数据备份任务', status: 'running', text: 'task data backup' }
];

/**
 * 模拟节点数据（实际应从 API 获取）
 */
const MOCK_NODES: MockNode[] = [
  { id: '1', name: '输入节点', type: 'input', text: 'node input' },
  { id: '2', name: '处理节点', type: 'process', text: 'node process' },
  { id: '3', name: '输出节点', type: 'output', text: 'node output' },
  { id: '4', name: '条件节点', type: 'condition', text: 'node condition' },
  { id: '5', name: '循环节点', type: 'loop', text: 'node loop' }
];

/**
 * 热门搜索（静态数据）
 */
const POPULAR_SEARCHES = [
  '工作流',
  'workflow',
  '任务',
  'task',
  '节点',
  'node',
  '数据分析',
  'data analysis',
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
   * localStorage 是唯一数据源：每次访问都重新同步，
   * 避免内存缓存与持久化数据不一致（例如其他标签页清理了存储）
   */
  private load(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      this.history = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(this.history)) {
        this.history = [];
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

    // 先与持久化数据同步，避免覆盖其他来源写入的历史
    this.load();

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
    // 以 localStorage 为准，确保外部清理（如测试/其他标签页）能立即生效
    this.load();
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
    this.load();
    this.history = this.history.filter((h) => h !== query);
    this.save();
  }
}

// 单例实例
export const searchHistory = new SearchHistoryManager();

/**
 * 对一组候选文本打分，返回最高分（未匹配返回 null）
 *
 * 匹配优先级：完全匹配 > 子串包含 > 模糊匹配（Levenshtein）
 * 之所以需要子串匹配：mock 数据的展示名是中文，
 * 而用户可能输入英文别名（如 "workflow"），仅靠编辑距离无法命中。
 */
function scoreCandidates(
  candidates: (string | undefined)[],
  query: string,
  options: FuzzySearchOptions
): number | null {
  const { ignoreCase = true } = options;
  const normalizedQuery = ignoreCase ? query.toLowerCase() : query;
  let best: number | null = null;

  for (const candidate of candidates) {
    if (!candidate) continue;

    const text = ignoreCase ? candidate.toLowerCase() : candidate;

    if (text === normalizedQuery) {
      best = Math.max(best ?? 0, 1);
      continue;
    }

    if (text.includes(normalizedQuery)) {
      // 越接近完整匹配，分数越高
      const coverage = normalizedQuery.length / text.length;
      best = Math.max(best ?? 0, 0.6 + 0.3 * coverage);
      continue;
    }

    const result = fuzzyMatch(candidate, query, options);
    if (result.matched) {
      best = Math.max(best ?? 0, result.score);
    }
  }

  return best;
}

/**
 * 通用匹配：items 中每项可提供多个可匹配文本字段
 */
function matchItems<T>(
  items: T[],
  query: string,
  options: FuzzySearchOptions,
  getCandidates: (item: T) => (string | undefined)[]
): { item: T; score: number }[] {
  return items
    .map((item) => {
      const score = scoreCandidates(getCandidates(item), query, options);
      return score === null ? null : { item, score };
    })
    .filter((r): r is { item: T; score: number } => r !== null)
    .sort((a, b) => b.score - a.score);
}

/**
 * 从工作流获取建议
 */
async function getWorkflowSuggestions(
  query: string,
  options: FuzzySearchOptions
): Promise<SearchSuggestion[]> {
  const results = matchItems(MOCK_WORKFLOWS, query, options, (wf) => [
    wf.name,
    wf.text,
    wf.description
  ]);

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
  const results = matchItems(MOCK_TASKS, query, options, (task) => [
    task.name,
    task.text,
    task.status
  ]);

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
  const results = matchItems(MOCK_NODES, query, options, (node) => [
    node.name,
    node.text,
    node.type
  ]);

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

  // limit <= 0 表示不返回任何建议
  return limit > 0 ? filtered.slice(0, limit) : [];
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
  workflows?: MockWorkflow[];
  tasks?: MockTask[];
  nodes?: MockNode[];
}): void {
  // 在实际应用中，这些数据应该从 API 获取
  // 这里只是为了演示方便
  if (workflows) MOCK_WORKFLOWS.splice(0, MOCK_WORKFLOWS.length, ...workflows);
  if (tasks) MOCK_TASKS.splice(0, MOCK_TASKS.length, ...tasks);
  if (nodes) MOCK_NODES.splice(0, MOCK_NODES.length, ...nodes);
}
