/**
 * Utility Functions - v1.10.0
 * 日志聚合系统工具函数
 */

import type {
  LogEntry,
  LogLevel,
  TimeRange,
  QueryFilter,
  AggregationSpec,
  AggregateResult,
  AggregateBucket,
} from '../types.js';

/**
 * 格式化时间范围
 */
export function formatTimeRange(range: TimeRange): string {
  const format = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };
  return `${format(range.start)} - ${format(range.end)}`;
}

/**
 * 解析时间范围字符串
 */
export function parseTimeRange(input: string): TimeRange {
  const now = new Date();
  
  // Relative time
  if (input.startsWith('last')) {
    const match = input.match(/last\s+(\d+)\s*(second|minute|hour|day|week|month)s?/i);
    if (match) {
      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      
      const end = new Date(now);
      const start = new Date(now);
      
      switch (unit) {
        case 'second':
          start.setSeconds(start.getSeconds() - amount);
          break;
        case 'minute':
          start.setMinutes(start.getMinutes() - amount);
          break;
        case 'hour':
          start.setHours(start.getHours() - amount);
          break;
        case 'day':
          start.setDate(start.getDate() - amount);
          break;
        case 'week':
          start.setDate(start.getDate() - amount * 7);
          break;
        case 'month':
          start.setMonth(start.getMonth() - amount);
          break;
      }
      
      return { start, end };
    }
  }

  // ISO range
  if (input.includes('/')) {
    const [startStr, endStr] = input.split('/');
    return {
      start: new Date(startStr),
      end: new Date(endStr),
    };
  }

  // Single date (whole day)
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  throw new Error(`Invalid time range: ${input}`);
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 解析日志级别
 */
export function parseLogLevel(level: string): LogLevel {
  const levelMap: Record<string, LogLevel> = {
    trace: 'trace',
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    warning: 'warn',
    error: 'error',
    fatal: 'fatal',
    critical: 'fatal',
  };

  const normalized = level.toLowerCase();
  return levelMap[normalized] || 'info';
}

/**
 * 日志级别权重
 */
export function getLogLevelWeight(level: LogLevel): number {
  const weights: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };
  return weights[level];
}

/**
 * 比较日志级别
 */
export function compareLogLevels(a: LogLevel, b: LogLevel): number {
  return getLogLevelWeight(a) - getLogLevelWeight(b);
}

/**
 * 检查日志级别是否满足阈值
 */
export function meetsLogLevelThreshold(level: LogLevel, threshold: LogLevel): boolean {
  return getLogLevelWeight(level) >= getLogLevelWeight(threshold);
}

/**
 * 创建简单的查询过滤器
 */
export function createFilter(
  field: string,
  operator: QueryFilter['operator'],
  value: unknown,
  negate = false
): QueryFilter {
  return { field, operator, value, negate };
}

/**
 * 合并过滤器
 */
export function mergeFilters(...filters: QueryFilter[][]): QueryFilter[] {
  return filters.flat();
}

/**
 * 创建聚合规格
 */
export function createAggregation(
  type: AggregationSpec['type'],
  field: string,
  name: string,
  options?: Partial<AggregationSpec>
): AggregationSpec {
  return {
    type,
    field,
    name,
    ...options,
  };
}

/**
 * 计算百分位数
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/**
 * 计算统计摘要
 */
export function calculateStats(values: number[]): {
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
  median: number;
  p95: number;
  p99: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0, median: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / values.length,
    sum,
    count: values.length,
    median: calculatePercentile(values, 50),
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99),
  };
}

/**
 * 批量处理
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  let inThrottle = false;
  
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: unknown[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 检查是否为有效的 JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 截断字符串
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 分组
 */
export function groupBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return groups;
}

/**
 * 排序
 */
export function sortBy<T>(
  items: T[],
  keyFn: (item: T) => number | string,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const valueA = keyFn(a);
    const valueB = keyFn(b);

    let comparison = 0;
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      comparison = valueA.localeCompare(valueB);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      comparison = valueA - valueB;
    }

    return order === 'desc' ? -comparison : comparison;
  });
}

/**
 * 去重
 */
export function uniqueBy<T, K>(items: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
