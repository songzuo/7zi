/**
 * Log Storage - v1.10.0
 * 日志存储实现（时序存储，支持检索和聚合）
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type {
  LogEntry,
  LogStorageConfig,
  ILogStorage,
  StoreResult,
  QueryResult,
  AggregateResult,
  DeleteResult,
  StorageStats,
  BackupResult,
  RestoreResult,
  LogQuery,
  AggregateQuery,
  DeleteQuery,
  AggregateBucket,
  TimeRange,
  QueryFilter,
  FilterOperator,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 内存索引节点
 */
interface IndexNode {
  id: string;
  timestamp: Date;
  level: string;
  source: string;
  message: string;
  offset: number;
  size: number;
}

/**
 * 时间序列分区
 */
interface TimePartition {
  start: Date;
  end: Date;
  entries: LogEntry[];
  index: Map<string, IndexNode>;
  size: number;
  path?: string;
}

/**
 * 内存日志存储
 */
export class MemoryLogStorage extends EventEmitter implements ILogStorage {
  protected _partitions: Map<string, TimePartition> = new Map();
  private _currentIndex: Map<string, Set<string>> = new Map();
  private _levelIndex: Map<string, Set<string>> = new Map();
  private _sourceIndex: Map<string, Set<string>> = new Map();
  private _fullTextIndex: Map<string, Set<string>> = new Map();
  private _totalEntries = 0;
  private _totalSize = 0;
  private _listeners: LogEventListener[] = [];
  private _retentionDays: number;
  private _cleanupTimer?: NodeJS.Timeout;

  constructor(public readonly config: LogStorageConfig) {
    super();
    this._retentionDays = config.retentionDays || 7;
    this.setMaxListeners(100);
  }

  /**
   * 存储日志条目
   */
  async store(entries: LogEntry[]): Promise<StoreResult> {
    const stored: string[] = [];
    const errors: string[] = [];
    let storedCount = 0;

    for (const entry of entries) {
      try {
        // Create partition key (hourly)
        const partitionKey = this.getPartitionKey(entry.timestamp);
        
        // Get or create partition
        let partition = this._partitions.get(partitionKey);
        if (!partition) {
          partition = this.createPartition(entry.timestamp);
          this._partitions.set(partitionKey, partition);
        }

        // Add entry to partition
        partition.entries.push(entry);
        
        // Update indexes
        const indexNode: IndexNode = {
          id: entry.id,
          timestamp: entry.timestamp,
          level: entry.level,
          source: entry.source.name,
          message: entry.message,
          offset: partition.entries.length - 1,
          size: JSON.stringify(entry).length,
        };

        partition.index.set(entry.id, indexNode);
        
        // Update global indexes
        this.addToIndex(this._currentIndex, entry.id, entry.id);
        this.addToIndex(this._levelIndex, entry.level, entry.id);
        this.addToIndex(this._sourceIndex, entry.source.name, entry.id);
        
        // Update full-text index
        const words = this.tokenize(entry.message);
        for (const word of words) {
          this.addToIndex(this._fullTextIndex, word.toLowerCase(), entry.id);
        }

        // Update stats
        partition.size += indexNode.size;
        this._totalSize += indexNode.size;
        this._totalEntries++;

        stored.push(entry.id);
        storedCount++;
      } catch (error) {
        errors.push(`Failed to store entry ${entry.id}: ${(error as Error).message}`);
      }
    }

    // Emit event
    await this.emitEvent({
      type: 'log_stored',
      count: storedCount,
      size: this._totalSize,
    });

    return {
      success: errors.length === 0,
      stored: storedCount,
      failed: entries.length - storedCount,
      errors: errors.length > 0 ? errors : undefined,
      ids: stored,
    };
  }

  /**
   * 查询日志
   */
  async query(query: LogQuery): Promise<QueryResult> {
    const startTime = Date.now();
    
    // Get candidate partitions
    const partitionKeys = this.getPartitionKeysInRange(query.timeRange);
    
    // Collect matching entries
    let candidates: LogEntry[] = [];
    
    for (const key of partitionKeys) {
      const partition = this._partitions.get(key);
      if (partition) {
        candidates = candidates.concat(partition.entries);
      }
    }

    // Apply filters
    candidates = this.applyFilters(candidates, query.filters || []);
    
    // Apply text query
    if (query.textQuery) {
      candidates = this.applyTextQuery(candidates, query.textQuery);
    }

    // Apply sort
    if (query.sort && query.sort.length > 0) {
      candidates = this.applySort(candidates, query.sort);
    }

    // Get total before pagination
    const total = candidates.length;

    // Apply pagination
    if (query.pagination) {
      const { offset, limit } = query.pagination;
      candidates = candidates.slice(offset, offset + limit);
    }

    // Apply field projection
    if (query.fields && query.fields.length > 0) {
      candidates = this.projectFields(candidates, query.fields);
    }

    const took = Date.now() - startTime;

    // Emit event
    await this.emitEvent({
      type: 'query_executed',
      took,
      hits: total,
    });

    return {
      entries: candidates,
      total,
      took,
    };
  }

  /**
   * 聚合查询
   */
  async aggregate(query: AggregateQuery): Promise<AggregateResult> {
    const startTime = Date.now();
    
    // Get partition keys in range
    const partitionKeys = this.getPartitionKeysInRange(query.timeRange);
    
    // Collect entries
    let entries: LogEntry[] = [];
    for (const key of partitionKeys) {
      const partition = this._partitions.get(key);
      if (partition) {
        entries = entries.concat(partition.entries);
      }
    }

    // Apply filters
    entries = this.applyFilters(entries, query.filters || []);

    // Group by fields
    const groups = this.groupBy(entries, query.groupBy);
    
    // Calculate aggregations
    const buckets: AggregateBucket[] = [];
    
    for (const [key, groupEntries] of Array.from(groups.entries())) {
      const values: Record<string, number> = {};
      
      for (const agg of query.aggregations) {
        values[agg.name] = this.calculateAggregation(groupEntries, agg);
      }

      buckets.push({
        key: this.parseGroupKey(key, query.groupBy),
        values,
        docCount: groupEntries.length,
      });
    }

    // Sort buckets by doc count
    buckets.sort((a, b) => b.docCount - a.docCount);

    // Apply limit
    const limitedBuckets = query.limit ? buckets.slice(0, query.limit) : buckets;

    const took = Date.now() - startTime;

    return {
      buckets: limitedBuckets,
      took,
      totalBuckets: buckets.length,
    };
  }

  /**
   * 删除日志
   */
  async delete(query: DeleteQuery): Promise<DeleteResult> {
    const startTime = Date.now();
    let deleted = 0;

    // Find matching entries
    const partitionKeys = query.timeRange
      ? this.getPartitionKeysInRange(query.timeRange)
      : Array.from(this._partitions.keys());

    for (const key of partitionKeys) {
      const partition = this._partitions.get(key);
      if (!partition) continue;

      const toDelete: string[] = [];
      
      for (const [id, node] of Array.from(partition.index.entries())) {
        if (this.matchesFilters(partition.entries[node.offset], query.filters || [])) {
          toDelete.push(id);
        }
      }

      for (const id of toDelete) {
        const node = partition.index.get(id);
        if (node) {
          // Update stats
          partition.size -= node.size;
          this._totalSize -= node.size;
          this._totalEntries--;

          // Remove from indexes
          partition.index.delete(id);
          this._currentIndex.delete(id);
          this.removeFromIndex(this._levelIndex, node.level, id);
          this.removeFromIndex(this._sourceIndex, node.source, id);

          // Remove from full-text index
          const words = this.tokenize(node.message);
          for (const word of words) {
            this.removeFromIndex(this._fullTextIndex, word.toLowerCase(), id);
          }

          // Mark entry as deleted (keep array for offset consistency)
          partition.entries[node.offset] = null as unknown as LogEntry;
          
          deleted++;
        }
      }

      // Remove empty partitions
      if (partition.index.size === 0) {
        this._partitions.delete(key);
      }
    }

    const took = Date.now() - startTime;

    return {
      deleted,
      took,
    };
  }

  /**
   * 获取存储统计
   */
  getStats(): StorageStats {
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const partition of Array.from(this._partitions.values())) {
      for (const node of Array.from(partition.index.values())) {
        if (!oldestEntry || node.timestamp < oldestEntry) {
          oldestEntry = node.timestamp;
        }
        if (!newestEntry || node.timestamp > newestEntry) {
          newestEntry = node.timestamp;
        }
      }
    }

    return {
      totalEntries: this._totalEntries,
      totalSize: this._totalSize,
      indexCount: this._partitions.size,
      avgEntrySize: this._totalEntries > 0 ? this._totalSize / this._totalEntries : 0,
      oldestEntry,
      newestEntry,
      compressionRatio: 1,
      throughput: 0,
    };
  }

  /**
   * 优化存储
   */
  async optimize(): Promise<void> {
    // Clean up deleted entries
    for (const [key, partition] of Array.from(this._partitions.entries())) {
      const newEntries: LogEntry[] = [];
      const newIndex = new Map<string, IndexNode>();
      
      for (const entry of partition.entries) {
        if (entry) {
          const id = entry.id;
          newEntries.push(entry);
          
          const node = partition.index.get(id);
          if (node) {
            node.offset = newEntries.length - 1;
            newIndex.set(id, node);
          }
        }
      }

      partition.entries = newEntries;
      partition.index = newIndex;
    }
  }

  /**
   * 备份
   */
  async backup(path: string): Promise<BackupResult> {
    const data = {
      partitions: Array.from(this._partitions.entries()).map(([key, partition]) => ({
        key,
        entries: partition.entries,
        start: partition.start,
        end: partition.end,
      })),
      exportedAt: new Date(),
    };

    const content = JSON.stringify(data);
    await fs.writeFile(path, content, 'utf8');

    return {
      success: true,
      path,
      size: content.length,
      entries: this._totalEntries,
      timestamp: new Date(),
    };
  }

  /**
   * 恢复
   */
  async restore(path: string): Promise<RestoreResult> {
    const content = await fs.readFile(path, 'utf8');
    const data = JSON.parse(content);

    this._partitions.clear();
    this._currentIndex.clear();
    this._levelIndex.clear();
    this._sourceIndex.clear();
    this._fullTextIndex.clear();
    this._totalEntries = 0;
    this._totalSize = 0;

    let entries = 0;
    let errors = 0;

    for (const partitionData of data.partitions) {
      const partition: TimePartition = {
        start: new Date(partitionData.start),
        end: new Date(partitionData.end),
        entries: partitionData.entries,
        index: new Map(),
        size: 0,
      };

      for (const entry of partition.entries) {
        if (entry) {
          const node: IndexNode = {
            id: entry.id,
            timestamp: new Date(entry.timestamp),
            level: entry.level,
            source: entry.source?.name || '',
            message: entry.message,
            offset: partition.index.size,
            size: JSON.stringify(entry).length,
          };

          partition.index.set(entry.id, node);
          partition.size += node.size;
          
          this._totalSize += node.size;
          this._totalEntries++;
          entries++;

          // Rebuild indexes
          this.addToIndex(this._currentIndex, entry.id, entry.id);
          this.addToIndex(this._levelIndex, entry.level, entry.id);
          if (entry.source?.name) {
            this.addToIndex(this._sourceIndex, entry.source.name, entry.id);
          }

          const words = this.tokenize(entry.message);
          for (const word of words) {
            this.addToIndex(this._fullTextIndex, word.toLowerCase(), entry.id);
          }
        }
      }

      this._partitions.set(partitionData.key, partition);
    }

    return {
      success: true,
      entries,
      errors,
      timestamp: new Date(),
    };
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
   * 获取分区键（小时粒度）
   */
  private getPartitionKey(timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hour = String(timestamp.getHours()).padStart(2, '0');
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * 创建分区
   */
  private createPartition(timestamp: Date): TimePartition {
    const start = new Date(timestamp);
    start.setMinutes(0, 0, 0);
    
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    return {
      start,
      end,
      entries: [],
      index: new Map(),
      size: 0,
    };
  }

  /**
   * 获取时间范围内的分区键
   */
  private getPartitionKeysInRange(timeRange: TimeRange): string[] {
    const keys: string[] = [];
    const current = new Date(timeRange.start);
    current.setMinutes(0, 0, 0);

    while (current <= timeRange.end) {
      keys.push(this.getPartitionKey(current));
      current.setHours(current.getHours() + 1);
    }

    return keys;
  }

  /**
   * 添加到索引
   */
  private addToIndex(index: Map<string, Set<string>>, key: string, value: string): void {
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key)!.add(value);
  }

  /**
   * 从索引移除
   */
  private removeFromIndex(index: Map<string, Set<string>>, key: string, value: string): void {
    const set = index.get(key);
    if (set) {
      set.delete(value);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  /**
   * 分词
   */
  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter((word) => word.length > 2);
  }

  /**
   * 应用过滤器
   */
  private applyFilters(entries: LogEntry[], filters: QueryFilter[]): LogEntry[] {
    return entries.filter((entry) => this.matchesFilters(entry, filters));
  }

  /**
   * 匹配过滤器
   */
  private matchesFilters(entry: LogEntry, filters: QueryFilter[]): boolean {
    for (const filter of filters) {
      const value = this.getFieldValue(entry, filter.field);
      const matches = this.matchFilter(value, filter.operator, filter.value);
      
      if (filter.negate ? matches : !matches) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取字段值
   */
  private getFieldValue(entry: LogEntry, field: string): unknown {
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
   * 匹配过滤器操作
   */
  private matchFilter(value: unknown, operator: FilterOperator, target: unknown): boolean {
    switch (operator) {
      case 'eq':
        return value === target;
      case 'neq':
        return value !== target;
      case 'gt':
        return typeof value === 'number' && typeof target === 'number' && value > target;
      case 'gte':
        return typeof value === 'number' && typeof target === 'number' && value >= target;
      case 'lt':
        return typeof value === 'number' && typeof target === 'number' && value < target;
      case 'lte':
        return typeof value === 'number' && typeof target === 'number' && value <= target;
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'notin':
        return Array.isArray(target) && !target.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'missing':
        return value === undefined || value === null;
      case 'contains':
        return typeof value === 'string' && typeof target === 'string' && value.includes(target);
      case 'startswith':
        return typeof value === 'string' && typeof target === 'string' && value.startsWith(target);
      case 'endswith':
        return typeof value === 'string' && typeof target === 'string' && value.endsWith(target);
      case 'regex':
        if (typeof value === 'string' && typeof target === 'string') {
          const regex = new RegExp(target);
          return regex.test(value);
        }
        return false;
      case 'wildcard':
        if (typeof value === 'string' && typeof target === 'string') {
          const pattern = target.replace(/\*/g, '.*').replace(/\?/g, '.');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(value);
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * 应用文本查询
   */
  private applyTextQuery(entries: LogEntry[], textQuery: string): LogEntry[] {
    const words = this.tokenize(textQuery);
    const matchingIds = new Set<string>();

    for (const word of words) {
      const ids = this._fullTextIndex.get(word.toLowerCase());
      if (ids) {
        for (const id of Array.from(ids)) {
          matchingIds.add(id);
        }
      }
    }

    return entries.filter((entry) => matchingIds.has(entry.id));
  }

  /**
   * 应用排序
   */
  private applySort(entries: LogEntry[], sort: LogQuery['sort']): LogEntry[] {
    if (!sort || sort.length === 0) {
      return entries;
    }
    return entries.sort((a, b) => {
      for (const { field, order } of sort) {
        const valueA = this.getFieldValue(a, field);
        const valueB = this.getFieldValue(b, field);
        
        let comparison = 0;
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.localeCompare(valueB);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else if (valueA instanceof Date && valueB instanceof Date) {
          comparison = valueA.getTime() - valueB.getTime();
        }

        if (comparison !== 0) {
          return order === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * 字段投影
   */
  private projectFields(entries: LogEntry[], fields: string[]): LogEntry[] {
    return entries.map((entry) => {
      const projected: Partial<LogEntry> = { id: entry.id };
      
      for (const field of fields) {
        const value = this.getFieldValue(entry, field);
        if (value !== undefined) {
          const parts = field.split('.');
          let current: Record<string, unknown> = projected as Record<string, unknown>;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
              current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
          }
          
          current[parts[parts.length - 1]] = value;
        }
      }
      
      return projected as LogEntry;
    });
  }

  /**
   * 分组
   */
  private groupBy(entries: LogEntry[], fields: string[]): Map<string, LogEntry[]> {
    const groups = new Map<string, LogEntry[]>();
    
    for (const entry of entries) {
      const key = fields.map((field) => {
        const value = this.getFieldValue(entry, field);
        return String(value ?? 'null');
      }).join('|');
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    }
    
    return groups;
  }

  /**
   * 解析分组键
   */
  private parseGroupKey(key: string, fields: string[]): Record<string, unknown> {
    const values = key.split('|');
    const result: Record<string, unknown> = {};
    
    for (let i = 0; i < fields.length; i++) {
      result[fields[i]] = values[i] === 'null' ? null : values[i];
    }
    
    return result;
  }

  /**
   * 计算聚合
   */
  private calculateAggregation(
    entries: LogEntry[],
    spec: AggregateQuery['aggregations'][0]
  ): number {
    const values = entries
      .map((e) => this.getFieldValue(e, spec.field))
      .filter((v): v is number => typeof v === 'number');

    switch (spec.type) {
      case 'count':
        return entries.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      case 'percentile':
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((spec.percentile || 50) / 100 * sorted.length) - 1;
        return sorted[Math.max(0, index)];
      case 'cardinality':
        return new Set(values).size;
      default:
        return 0;
    }
  }
}

/**
 * 文件日志存储
 */
export class FileLogStorage extends MemoryLogStorage {
  private _basePath: string;
  private _flushTimer?: NodeJS.Timeout;

  constructor(config: LogStorageConfig) {
    super(config);
    this._basePath = config.warmStoragePath || './logs';
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this._basePath, { recursive: true });
    
    // Start periodic flush
    this._flushTimer = setInterval(() => {
      this.flushToDisk().catch(console.error);
    }, 60000); // Every minute
  }

  /**
   * 刷新到磁盘
   */
  private async flushToDisk(): Promise<void> {
    for (const [key, partition] of Array.from(this._partitions.entries())) {
      const path = join(this._basePath, `${key}.json`);
      const data = {
        entries: partition.entries,
        start: partition.start,
        end: partition.end,
      };
      await fs.writeFile(path, JSON.stringify(data), 'utf8');
    }
  }

  /**
   * 清理
   */
  async stop(): Promise<void> {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
    }
    await this.flushToDisk();
  }
}

/**
 * 存储工厂
 */
export class LogStorageFactory {
  /**
   * 创建存储
   */
  static create(config: LogStorageConfig): ILogStorage {
    switch (config.type) {
      case 'memory':
        return new MemoryLogStorage(config);
      case 'file':
        return new FileLogStorage(config);
      default:
        // Default to memory for unsupported types
        console.warn(`Unsupported storage type: ${config.type}, falling back to memory`);
        return new MemoryLogStorage(config);
    }
  }
}