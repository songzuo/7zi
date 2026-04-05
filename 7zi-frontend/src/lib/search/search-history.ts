/**
 * Smart Search - 搜索历史管理
 * 持久化到 localStorage
 */

export interface SearchHistoryEntry {
  /** 搜索查询 */
  query: string;
  /** 搜索时间（ISO 字符串） */
  timestamp: string;
  /** 搜索结果数量 */
  resultCount?: number;
  /** 搜索类型 */
  type?: 'all' | 'workflow' | 'task' | 'node';
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

export interface SearchHistoryOptions {
  /** 最大历史记录数量（默认 50） */
  maxSize?: number;
  /** 是否持久化（默认 true） */
  persist?: boolean;
  /** localStorage 键名 */
  storageKey?: string;
}

/**
 * 搜索历史管理类
 */
export class SearchHistory {
  private readonly storageKey: string;
  private maxSize: number;
  private persist: boolean;
  private history: SearchHistoryEntry[];

  constructor(options: SearchHistoryOptions = {}) {
    this.storageKey = options.storageKey || 'search-history-v2';
    this.maxSize = options.maxSize || 50;
    this.persist = options.persist !== false;
    this.history = [];

    if (this.persist && typeof window !== 'undefined') {
      this.load();
    }
  }

  /**
   * 从 localStorage 加载历史记录
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
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
    if (!this.persist || typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }

  /**
   * 添加搜索记录
   */
  add(
    query: string,
    metadata?: Partial<Omit<SearchHistoryEntry, 'query' | 'timestamp'>>
  ): void {
    if (!query || query.trim().length === 0) return;

    // 移除相同查询的旧记录
    this.history = this.history.filter((entry) => entry.query !== query);

    // 创建新记录
    const newEntry: SearchHistoryEntry = {
      query: query.trim(),
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // 添加到开头
    this.history.unshift(newEntry);

    // 限制大小
    if (this.history.length > this.maxSize) {
      this.history = this.history.slice(0, this.maxSize);
    }

    this.save();
  }

  /**
   * 获取最近的历史记录（仅查询字符串）
   */
  getRecent(limit?: number): string[] {
    const size = limit || this.history.length;
    return this.history.slice(0, size).map((entry) => entry.query);
  }

  /**
   * 获取最近的历史记录（完整数据）
   */
  getRecentEntries(limit?: number): SearchHistoryEntry[] {
    const size = limit || this.history.length;
    return this.history.slice(0, size);
  }

  /**
   * 按时间范围获取历史记录
   */
  getByDateRange(startDate: Date, endDate: Date): SearchHistoryEntry[] {
    const start = startDate.getTime();
    const end = endDate.getTime();

    return this.history.filter((entry) => {
      const timestamp = new Date(entry.timestamp).getTime();
      return timestamp >= start && timestamp <= end;
    });
  }

  /**
   * 按类型获取历史记录
   */
  getByType(type: SearchHistoryEntry['type']): SearchHistoryEntry[] {
    if (!type) return this.history;
    return this.history.filter((entry) => entry.type === type);
  }

  /**
   * 搜索历史记录（模糊查询）
   */
  searchHistory(query: string): SearchHistoryEntry[] {
    if (!query || query.trim().length === 0) {
      return this.history;
    }

    const lowerQuery = query.toLowerCase();
    return this.history.filter((entry) =>
      entry.query.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 更新历史记录元数据
   */
  updateMetadata(query: string, metadata: Partial<SearchHistoryEntry['metadata']>): void {
    const entry = this.history.find((e) => e.query === query);
    if (entry) {
      entry.metadata = { ...entry.metadata, ...metadata };
      this.save();
    }
  }

  /**
   * 删除指定历史记录
   */
  remove(query: string): void {
    this.history = this.history.filter((entry) => entry.query !== query);
    this.save();
  }

  /**
   * 删除指定索引的历史记录
   */
  removeAt(index: number): void {
    if (index >= 0 && index < this.history.length) {
      this.history.splice(index, 1);
      this.save();
    }
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = [];
    this.save();
  }

  /**
   * 清空指定时间之前的历史记录
   */
  clearBefore(date: Date): void {
    const timestamp = date.getTime();
    this.history = this.history.filter(
      (entry) => new Date(entry.timestamp).getTime() >= timestamp
    );
    this.save();
  }

  /**
   * 清空指定时间之后的历史记录
   */
  clearAfter(date: Date): void {
    const timestamp = date.getTime();
    this.history = this.history.filter(
      (entry) => new Date(entry.timestamp).getTime() < timestamp
    );
    this.save();
  }

  /**
   * 导出历史记录（JSON 字符串）
   */
  export(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * 导入历史记录（从 JSON 字符串）
   */
  import(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString) as SearchHistoryEntry[];

      if (!Array.isArray(imported)) {
        throw new Error('Invalid format: expected array');
      }

      // 合并历史记录
      const existingQueries = new Set(this.history.map((e) => e.query));
      const newEntries = imported.filter((entry) => !existingQueries.has(entry.query));

      this.history = [...newEntries, ...this.history].slice(0, this.maxSize);
      this.save();
    } catch (error) {
      console.error('Failed to import search history:', error);
      throw new Error('Invalid JSON format');
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this.history.length;
    const byType = this.history.reduce((acc, entry) => {
      const type = entry.type || 'all';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueQueries = new Set(this.history.map((e) => e.query)).size;
    const averageResultCount =
      total > 0
        ? this.history.reduce((sum, e) => sum + (e.resultCount || 0), 0) / total
        : 0;

    return {
      total,
      uniqueQueries,
      averageResultCount,
      byType,
      oldest: this.history[this.history.length - 1]?.timestamp || null,
      newest: this.history[0]?.timestamp || null
    };
  }

  /**
   * 获取所有历史记录
   */
  getAll(): SearchHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 获取历史记录数量
   */
  getCount(): number {
    return this.history.length;
  }

  /**
   * 检查是否包含指定查询
   */
  has(query: string): boolean {
    return this.history.some((entry) => entry.query === query);
  }

  /**
   * 查找指定查询的历史记录
   */
  find(query: string): SearchHistoryEntry | undefined {
    return this.history.find((entry) => entry.query === query);
  }
}

/**
 * 默认搜索历史实例（单例）
 */
export const defaultSearchHistory = new SearchHistory();

/**
 * 便捷函数：添加搜索记录
 */
export function addSearch(query: string, metadata?: Partial<SearchHistoryEntry>): void {
  defaultSearchHistory.add(query, metadata);
}

/**
 * 便捷函数：获取最近搜索
 */
export function getRecentSearches(limit?: number): string[] {
  return defaultSearchHistory.getRecent(limit);
}

/**
 * 便捷函数：清空搜索历史
 */
export function clearSearchHistory(): void {
  defaultSearchHistory.clear();
}

/**
 * 便捷函数：删除搜索历史
 */
export function removeSearch(query: string): void {
  defaultSearchHistory.remove(query);
}

/**
 * 便捷函数：获取搜索历史统计
 */
export function getSearchHistoryStats() {
  return defaultSearchHistory.getStats();
}
