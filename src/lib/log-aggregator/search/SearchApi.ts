/**
 * Search API - v1.10.0
 * 日志搜索 API 实现
 */

import { EventEmitter } from 'events';
import type {
  ISearchApi,
  SearchApiConfig,
  SearchRequest,
  SearchResponse,
  SearchResultHit,
  SuggestResult,
  ExplainResult,
  ValidateResult,
  ILogStorage,
  LogQuery,
  QueryFilter,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 搜索缓存项
 */
interface CacheItem {
  response: SearchResponse;
  timestamp: number;
  key: string;
}

/**
 * 查询解析器
 */
class QueryParser {
  /**
   * 解析查询字符串
   */
  parse(queryString: string): {
    text: string;
    filters: QueryFilter[];
  } {
    const filters: QueryFilter[] = [];
    let text = queryString;

    // Extract field:value pairs
    const fieldPattern = /(\w+):([^\s]+)/g;
    let match;

    while ((match = fieldPattern.exec(queryString)) !== null) {
      const [, field, value] = match;
      
      // Remove from text
      text = text.replace(match[0], '').trim();

      // Determine operator and value
      if (value.startsWith('-')) {
        filters.push({
          field,
          operator: 'neq',
          value: value.substring(1),
          negate: false,
        });
      } else if (value.startsWith('>') || value.startsWith('<')) {
        const operator = value.startsWith('>=') ? 'gte' : 
                        value.startsWith('<=') ? 'lte' :
                        value.startsWith('>') ? 'gt' : 'lt';
        const numValue = parseFloat(value.replace(/^[><=]+/, ''));
        if (!isNaN(numValue)) {
          filters.push({ field, operator, value: numValue });
        }
      } else if (value.includes('*')) {
        filters.push({ field, operator: 'wildcard', value });
      } else {
        filters.push({ field, operator: 'eq', value });
      }
    }

    // Extract range queries
    const rangePattern = /(\w+):\[(\S+)\s+TO\s+(\S+)\]/g;
    while ((match = rangePattern.exec(queryString)) !== null) {
      const [, field, from, to] = match;
      text = text.replace(match[0], '').trim();

      const fromNum = parseFloat(from);
      const toNum = parseFloat(to);

      if (!isNaN(fromNum) && !isNaN(toNum)) {
        filters.push({ field, operator: 'gte', value: fromNum });
        filters.push({ field, operator: 'lte', value: toNum });
      }
    }

    // Extract quoted phrases
    const quotePattern = /"([^"]+)"/g;
    const phrases: string[] = [];
    while ((match = quotePattern.exec(queryString)) !== null) {
      phrases.push(match[1]);
    }

    if (phrases.length > 0) {
      text = phrases.join(' ');
    }

    return { text, filters };
  }

  /**
   * 构建查询字符串
   */
  build(filters: QueryFilter[], text?: string): string {
    const parts: string[] = [];

    for (const filter of filters) {
      switch (filter.operator) {
        case 'eq':
          parts.push(`${filter.field}:${filter.value}`);
          break;
        case 'neq':
          parts.push(`${filter.field}:-${filter.value}`);
          break;
        case 'gt':
          parts.push(`${filter.field}:>${filter.value}`);
          break;
        case 'gte':
          parts.push(`${filter.field}:>=${filter.value}`);
          break;
        case 'lt':
          parts.push(`${filter.field}:<${filter.value}`);
          break;
        case 'lte':
          parts.push(`${filter.field}:<=${filter.value}`);
          break;
        case 'wildcard':
          parts.push(`${filter.field}:${filter.value}`);
          break;
        case 'in':
          if (Array.isArray(filter.value)) {
            parts.push(`${filter.value.map((v) => `${filter.field}:${v}`).join(' OR ')}`);
          }
          break;
      }
    }

    if (text) {
      parts.unshift(`"${text}"`);
    }

    return parts.join(' ');
  }
}

/**
 * 日志搜索 API
 */
export class LogSearchApi extends EventEmitter implements ISearchApi {
  private _storage: ILogStorage;
  private _config: SearchApiConfig;
  private _cache: Map<string, CacheItem> = new Map();
  private _queryParser: QueryParser;
  private _listeners: LogEventListener[] = [];
  private _cacheCleanupTimer?: NodeJS.Timeout;

  constructor(config: SearchApiConfig, storage: ILogStorage) {
    super();
    this._config = config;
    this._storage = storage;
    this._queryParser = new QueryParser();
    this.setMaxListeners(100);

    if (config.cacheEnabled) {
      this._cacheCleanupTimer = setInterval(
        () => this.cleanupCache(),
        60000
      );
    }
  }

  /**
   * 搜索日志
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    // Check cache
    if (this._config.cacheEnabled) {
      const cacheKey = this.getCacheKey(request);
      const cached = this._cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this._config.cacheTTL * 1000) {
        return {
          ...cached.response,
          took: Date.now() - startTime,
        };
      }
    }

    // Parse query
    const { text, filters } = this._queryParser.parse(request.query);

    // Build log query
    const logQuery: LogQuery = {
      timeRange: request.timeRange,
      filters: [...filters, ...(request.filters || [])],
      textQuery: text,
      sort: request.sort,
      pagination: request.pagination || { offset: 0, limit: this._config.maxResults },
    };

    // Execute query
    const result = await this._storage.query(logQuery);

    // Build search hits
    const hits: SearchResultHit[] = result.entries.map((entry) => ({
      entry,
      score: this.calculateRelevanceScore(entry, text, request.filters),
    }));

    // Sort by relevance if no explicit sort
    if (!request.sort || request.sort.length === 0) {
      hits.sort((a, b) => b.score - a.score);
    }

    // Apply highlighting
    if (request.highlight?.enabled) {
      for (const hit of hits) {
        hit.highlight = this.highlightEntry(hit.entry, request.highlight);
      }
    }

    const response: SearchResponse = {
      took: result.took,
      timedOut: result.took > this._config.timeout * 1000,
      hits,
      total: result.total,
      aggregations: result.aggregations,
    };

    // Cache result
    if (this._config.cacheEnabled) {
      const cacheKey = this.getCacheKey(request);
      this._cache.set(cacheKey, {
        response,
        timestamp: Date.now(),
        key: cacheKey,
      });
    }

    // Emit event
    await this.emitEvent({
      type: 'query_executed',
      took: result.took,
      hits: result.total,
    });

    return response;
  }

  /**
   * 获取建议
   */
  async suggest(text: string, field: string): Promise<SuggestResult> {
    // Simple prefix-based suggestion
    const suggestions = await this.getSuggestions(text, field);

    return {
      text,
      offset: 0,
      length: text.length,
      options: suggestions.map((suggestion) => ({
        text: suggestion.text,
        score: suggestion.score,
        frequency: suggestion.frequency,
      })),
    };
  }

  /**
   * 解释查询
   */
  async explain(request: SearchRequest, id: string): Promise<ExplainResult> {
    // Get the specific log entry
    const result = await this._storage.query({
      timeRange: request.timeRange,
      filters: [{ field: 'id', operator: 'eq', value: id }],
    });

    if (result.entries.length === 0) {
      return {
        score: 0,
        description: 'Document not found',
        details: [],
      };
    }

    const entry = result.entries[0];
    const { text, filters } = this._queryParser.parse(request.query);

    // Calculate detailed score
    const details: ExplainResult['details'] = [];
    let totalScore = 0;

    // Text match score
    if (text) {
      const textScore = this.calculateTextScore(entry, text);
      details.push({
        value: textScore,
        description: `Text match for "${text}"`,
      });
      totalScore += textScore;
    }

    // Filter match score
    for (const filter of filters) {
      const filterScore = this.calculateFilterScore(entry, filter);
      details.push({
        value: filterScore,
        description: `Filter match for ${filter.field}`,
      });
      totalScore += filterScore;
    }

    return {
      score: totalScore,
      description: `Total score: ${totalScore.toFixed(2)}`,
      details,
    };
  }

  /**
   * 验证查询
   */
  async validate(query: string): Promise<ValidateResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const { text, filters } = this._queryParser.parse(query);

      // Check for syntax errors
      const unbalancedQuotes = (query.match(/"/g)?.length || 0) % 2 !== 0;
      if (unbalancedQuotes) {
        errors.push('Unbalanced quotes in query');
      }

      // Check for valid filter fields
      const validFields = ['level', 'source', 'timestamp', 'message', 'metadata'];
      for (const filter of filters) {
        if (!validFields.some((f) => filter.field.startsWith(f))) {
          warnings.push(`Unknown field: ${filter.field}`);
        }
      }

      // Check for performance issues
      if (filters.length > 10) {
        warnings.push('Too many filters may impact performance');
      }

      if (text && text.length < 3) {
        warnings.push('Short search terms may return too many results');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (this._cacheCleanupTimer) {
      clearInterval(this._cacheCleanupTimer);
    }
    this.clearCache();
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: LogEventListener): void {
    this._listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: LogEventListener): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private async emitEvent(event: LogEvent): Promise<void> {
    for (const listener of this._listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener:`, error);
      }
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(request: SearchRequest): string {
    return JSON.stringify({
      query: request.query,
      filters: request.filters,
      timeRange: request.timeRange,
      sort: request.sort,
      pagination: request.pagination,
    });
  }

  /**
   * 清理过期缓存
   */
  private cleanupCache(): void {
    const now = Date.now();
    const ttl = this._config.cacheTTL * 1000;

    for (const [key, item] of Array.from(this._cache.entries())) {
      if (now - item.timestamp > ttl) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevanceScore(
    entry: SearchResultHit['entry'],
    text: string,
    filters?: QueryFilter[]
  ): number {
    let score = 1.0;

    // Text match score
    if (text) {
      score *= this.calculateTextScore(entry, text);
    }

    // Filter match score
    if (filters) {
      for (const filter of filters) {
        score *= this.calculateFilterScore(entry, filter);
      }
    }

    // Recency boost
    const age = Date.now() - entry.timestamp.getTime();
    const hourAge = age / (1000 * 60 * 60);
    score *= Math.max(0.5, 1 - hourAge / 24);

    // Error level boost
    if (entry.level === 'error' || entry.level === 'fatal') {
      score *= 1.5;
    }

    return score;
  }

  /**
   * 计算文本匹配分数
   */
  private calculateTextScore(entry: SearchResultHit['entry'], text: string): number {
    const textLower = text.toLowerCase();
    const messageLower = entry.message.toLowerCase();

    // Exact match
    if (messageLower.includes(textLower)) {
      // Boost for exact phrase match
      if (messageLower.includes(textLower)) {
        return 2.0;
      }
      return 1.5;
    }

    // Partial match
    const words = textLower.split(/\s+/);
    let matchCount = 0;
    for (const word of words) {
      if (messageLower.includes(word)) {
        matchCount++;
      }
    }

    return words.length > 0 ? matchCount / words.length : 0;
  }

  /**
   * 计算过滤器匹配分数
   */
  private calculateFilterScore(entry: SearchResultHit['entry'], filter: QueryFilter): number {
    const value = this.getFieldValue(entry, filter.field);
    
    // Check if filter matches
    const matches = this.matchFilter(value, filter);
    
    return matches ? 1.0 : 0.5;
  }

  /**
   * 获取字段值
   */
  private getFieldValue(entry: SearchResultHit['entry'], field: string): unknown {
    const parts = field.split('.');
    let value: unknown = entry;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 匹配过滤器
   */
  private matchFilter(value: unknown, filter: QueryFilter): boolean {
    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'neq':
        return value !== filter.value;
      case 'gt':
        return typeof value === 'number' && typeof filter.value === 'number' && value > filter.value;
      case 'gte':
        return typeof value === 'number' && typeof filter.value === 'number' && value >= filter.value;
      case 'lt':
        return typeof value === 'number' && typeof filter.value === 'number' && value < filter.value;
      case 'lte':
        return typeof value === 'number' && typeof filter.value === 'number' && value <= filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'contains':
        return typeof value === 'string' && typeof filter.value === 'string' && value.includes(filter.value);
      case 'wildcard':
        if (typeof value === 'string' && typeof filter.value === 'string') {
          const pattern = filter.value.replace(/\*/g, '.*').replace(/\?/g, '.');
          return new RegExp(`^${pattern}$`).test(value);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * 高亮显示条目
   */
  private highlightEntry(
    entry: SearchResultHit['entry'],
    config: SearchRequest['highlight']
  ): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};
    const preTag = config?.preTag || '<em>';
    const postTag = config?.postTag || '</em>';
    const fields = config?.fields || ['message'];

    for (const field of fields) {
      const value = this.getFieldValue(entry, field);
      if (typeof value === 'string') {
        const highlighted = this.highlightText(value, '', preTag, postTag);
        if (highlighted !== value) {
          highlights[field] = [highlighted];
        }
      }
    }

    return highlights;
  }

  /**
   * 高亮文本
   */
  private highlightText(
    text: string,
    searchTerm: string,
    preTag: string,
    postTag: string
  ): string {
    if (!searchTerm) {
      return text;
    }

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, `${preTag}$1${postTag}`);
  }

  /**
   * 获取建议
   */
  private async getSuggestions(
    text: string,
    field: string
  ): Promise<Array<{ text: string; score: number; frequency?: number }>> {
    // Get recent logs for suggestions
    const result = await this._storage.query({
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      pagination: { offset: 0, limit: 1000 },
    });

    // Extract field values
    const values = result.entries
      .map((e) => this.getFieldValue(e, field))
      .filter((v): v is string => typeof v === 'string');

    // Count occurrences
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    // Filter by prefix
    const textLower = text.toLowerCase();
    const suggestions = Array.from(counts.entries())
      .filter(([value]) => value.toLowerCase().startsWith(textLower))
      .map(([text, frequency]) => ({
        text,
        score: frequency / result.total,
        frequency,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return suggestions;
  }
}
