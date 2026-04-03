/**
 * 审计日志系统 - 内存存储
 * @module lib/audit-log/storage/memory-storage
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditQueryOptions,
  AuditQueryResult,
  AuditQueryFilter,
  AuditStorageStats,
  AuditLogLevel,
  AuditEventCategory,
} from '../types.js';
import type { AuditLogStorage } from '../types.js';

/**
 * 内存审计日志存储
 * 主要用于测试和轻量级场景
 */
export class MemoryAuditStorage implements AuditLogStorage {
  private events: AuditEvent[] = [];
  private eventIndex: Map<string, number> = new Map();
  private maxEvents: number;

  constructor(options?: { maxEvents?: number }) {
    this.maxEvents = options?.maxEvents || 10000;
  }

  /**
   * 写入事件
   */
  public async write(event: AuditEvent): Promise<void> {
    // 检查是否需要删除旧事件
    if (this.events.length >= this.maxEvents) {
      const removed = this.events.shift();
      if (removed) {
        this.eventIndex.delete(removed.id);
      }
    }

    this.events.push(event);
    this.eventIndex.set(event.id, this.events.length - 1);
  }

  /**
   * 批量写入
   */
  public async writeBatch(events: AuditEvent[]): Promise<void> {
    for (const event of events) {
      await this.write(event);
    }
  }

  /**
   * 查询事件
   */
  public async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    const startTime = Date.now();

    // 应用过滤器
    let filteredEvents = this.applyFilter(options.filter || {});

    // 应用排序
    if (options.sort) {
      filteredEvents = this.applySort(filteredEvents, options.sort);
    } else {
      // 默认按时间倒序
      filteredEvents.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // 计算总数
    const total = filteredEvents.length;

    // 应用分页
    const pagination = options.pagination || { page: 1, pageSize: 50 };
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    // 处理包含选项
    const processedEvents = this.applyIncludeOptions(paginatedEvents, options);

    return {
      data: processedEvents,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
      duration: Date.now() - startTime,
    };
  }

  /**
   * 按ID获取
   */
  public async getById(id: string): Promise<AuditEvent | null> {
    const index = this.eventIndex.get(id);
    if (index === undefined) {
      return null;
    }
    return this.events[index] || null;
  }

  /**
   * 删除事件
   */
  public async delete(id: string): Promise<boolean> {
    const index = this.eventIndex.get(id);
    if (index === undefined) {
      return false;
    }

    this.events.splice(index, 1);
    this.eventIndex.delete(id);

    // 重建索引
    this.rebuildIndex();

    return true;
  }

  /**
   * 按条件删除
   */
  public async deleteByFilter(filter: AuditQueryFilter): Promise<number> {
    const filteredEvents = this.applyFilter(filter);
    const idsToDelete = new Set(filteredEvents.map((e) => e.id));

    const originalLength = this.events.length;
    this.events = this.events.filter((e) => !idsToDelete.has(e.id));

    this.rebuildIndex();

    return originalLength - this.events.length;
  }

  /**
   * 获取存储统计
   */
  public async getStats(): Promise<AuditStorageStats> {
    const stats: AuditStorageStats = {
      totalEvents: this.events.length,
      storageSize: this.estimateSize(),
      earliestEvent: this.events[0]?.timestamp,
      latestEvent: this.events[this.events.length - 1]?.timestamp,
      byCategory: {} as Record<AuditEventCategory, number>,
      byLevel: {} as Record<AuditLogLevel, number>,
    };

    // 统计各类别数量
    for (const event of this.events) {
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
      stats.byLevel[event.level] = (stats.byLevel[event.level] || 0) + 1;
    }

    return stats;
  }

  /**
   * 清理过期数据
   */
  public async cleanup(): Promise<number> {
    // 内存存储不自动清理，由 maxEvents 控制
    return 0;
  }

  /**
   * 关闭连接
   */
  public async close(): Promise<void> {
    // 内存存储无需关闭
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    this.events = [];
    this.eventIndex.clear();
  }

  /**
   * 获取所有事件 (用于测试)
   */
  public getAll(): AuditEvent[] {
    return [...this.events];
  }

  // ========== 私有方法 ==========

  /**
   * 应用过滤器
   */
  private applyFilter(filter: AuditQueryFilter): AuditEvent[] {
    return this.events.filter((event) => this.matchesFilter(event, filter));
  }

  /**
   * 检查事件是否匹配过滤条件
   */
  private matchesFilter(event: AuditEvent, filter: AuditQueryFilter): boolean {
    // 时间范围
    if (filter.timeRange) {
      const timestamp = new Date(event.timestamp).getTime();
      if (timestamp < new Date(filter.timeRange.start).getTime() ||
          timestamp > new Date(filter.timeRange.end).getTime()) {
        return false;
      }
    }

    // 用户ID
    if (filter.userIds && filter.userIds.length > 0) {
      if (!event.user || !filter.userIds.includes(event.user.userId)) {
        return false;
      }
    }

    // 用户名
    if (filter.usernames && filter.usernames.length > 0) {
      if (!event.user || !filter.usernames.includes(event.user.username || '')) {
        return false;
      }
    }

    // 组织ID
    if (filter.organizationIds && filter.organizationIds.length > 0) {
      if (!event.user || !filter.organizationIds.includes(event.user.organizationId || '')) {
        return false;
      }
    }

    // 事件级别
    if (filter.levels && filter.levels.length > 0) {
      if (!filter.levels.includes(event.level)) {
        return false;
      }
    }

    // 事件类别
    if (filter.categories && filter.categories.length > 0) {
      if (!filter.categories.includes(event.category)) {
        return false;
      }
    }

    // 操作类型
    if (filter.actions && filter.actions.length > 0) {
      if (!filter.actions.includes(event.action)) {
        return false;
      }
    }

    // 结果状态
    if (filter.statuses && filter.statuses.length > 0) {
      if (!filter.statuses.includes(event.status)) {
        return false;
      }
    }

    // 严重程度
    if (filter.severities && filter.severities.length > 0) {
      if (!filter.severities.includes(event.severity)) {
        return false;
      }
    }

    // 资源类型
    if (filter.resourceTypes && filter.resourceTypes.length > 0) {
      if (!event.resource || !filter.resourceTypes.includes(event.resource.type)) {
        return false;
      }
    }

    // 资源ID
    if (filter.resourceIds && filter.resourceIds.length > 0) {
      if (!event.resource || !event.resource.id || 
          !filter.resourceIds.includes(event.resource.id)) {
        return false;
      }
    }

    // 全文搜索
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const searchableText = [
        event.message,
        event.user?.username || '',
        event.user?.email || '',
        event.resource?.name || '',
        JSON.stringify(event.details || {}),
      ].join(' ').toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // 标签
    if (filter.tags && filter.tags.length > 0) {
      if (!event.tags || !filter.tags.some((tag) => event.tags!.includes(tag))) {
        return false;
      }
    }

    // 会话ID
    if (filter.sessionIds && filter.sessionIds.length > 0) {
      if (!event.user || !filter.sessionIds.includes(event.user.sessionId || '')) {
        return false;
      }
    }

    // 关联事件ID
    if (filter.correlationId) {
      if (event.correlationId !== filter.correlationId) {
        return false;
      }
    }

    // 客户端IP
    if (filter.clientIps && filter.clientIps.length > 0) {
      if (!event.request || !filter.clientIps.includes(event.request.clientIp || '')) {
        return false;
      }
    }

    return true;
  }

  /**
   * 应用排序
   */
  private applySort(
    events: AuditEvent[],
    sort: { field: string; order: 'asc' | 'desc' }
  ): AuditEvent[] {
    return [...events].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sort.field) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case 'level':
          const levels = ['debug', 'info', 'warn', 'error', 'critical'];
          aVal = levels.indexOf(a.level);
          bVal = levels.indexOf(b.level);
          break;
        case 'severity':
          const severities = ['low', 'medium', 'high', 'critical'];
          aVal = severities.indexOf(a.severity);
          bVal = severities.indexOf(b.severity);
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 应用包含选项
   */
  private applyIncludeOptions(
    events: AuditEvent[],
    options: AuditQueryOptions
  ): AuditEvent[] {
    return events.map((event) => {
      const processed = { ...event };

      if (!options.includeDetails) {
        delete processed.details;
      }

      if (!options.includeChanges) {
        delete processed.changes;
      }

      if (!options.includeMetadata) {
        delete processed.metadata;
      }

      return processed;
    });
  }

  /**
   * 重建索引
   */
  private rebuildIndex(): void {
    this.eventIndex.clear();
    this.events.forEach((event, index) => {
      this.eventIndex.set(event.id, index);
    });
  }

  /**
   * 估算存储大小
   */
  private estimateSize(): number {
    // 粗略估算 JSON 序列化后的字节大小
    const sampleSize = 1024;
    const sampleEvents = this.events.slice(0, Math.min(sampleSize, this.events.length));
    const avgEventSize = sampleEvents.length > 0
      ? Buffer.byteLength(JSON.stringify(sampleEvents), 'utf8') / sampleEvents.length
      : 0;

    return Math.round(avgEventSize * this.events.length);
  }
}