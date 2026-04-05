/**
 * 审计日志存储 - 内存存储实现
 * @module lib/audit/storage/memory-storage
 * @version 1.12.0
 */

import type {
  AuditLogEntry,
  AuditLogQueryOptions,
  AuditLogQueryResult,
  AuditLogStats,
  IAuditLogStorage,
} from '../types.js';

/**
 * 内存存储实现
 */
export class MemoryAuditStorage implements IAuditLogStorage {
  private logs: Map<string, AuditLogEntry> = new Map();
  private maxLogs: number;
  private logsByTimestamp: AuditLogEntry[] = [];

  constructor(maxLogs: number = 10000) {
    this.maxLogs = maxLogs;
  }

  /**
   * 添加日志
   */
  public async add(log: AuditLogEntry): Promise<void> {
    this.logs.set(log.id, log);
    this.logsByTimestamp.push(log);
    this.sortByTimestamp();
    this.enforceMaxLogs();
  }

  /**
   * 批量添加日志
   */
  public async addBatch(logs: AuditLogEntry[]): Promise<void> {
    for (const log of logs) {
      this.logs.set(log.id, log);
      this.logsByTimestamp.push(log);
    }
    this.sortByTimestamp();
    this.enforceMaxLogs();
  }

  /**
   * 查询日志
   */
  public async query(options: AuditLogQueryOptions): Promise<AuditLogQueryResult> {
    let filteredLogs = [...this.logsByTimestamp];

    // 应用过滤器
    if (options.userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === options.userId);
    }

    if (options.username) {
      filteredLogs = filteredLogs.filter((log) => log.username === options.username);
    }

    if (options.action) {
      filteredLogs = filteredLogs.filter((log) => log.action === options.action);
    }

    if (options.resource) {
      filteredLogs = filteredLogs.filter((log) => log.resource === options.resource);
    }

    if (options.resourceId) {
      filteredLogs = filteredLogs.filter((log) => log.resourceId === options.resourceId);
    }

    if (options.status) {
      filteredLogs = filteredLogs.filter((log) => log.status === options.status);
    }

    if (options.startTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      filteredLogs = filteredLogs.filter((log) => log.timestamp <= options.endTime!);
    }

    if (options.ipAddress) {
      filteredLogs = filteredLogs.filter((log) => log.ipAddress === options.ipAddress);
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.userId.toLowerCase().includes(search) ||
          log.username?.toLowerCase().includes(search) ||
          log.resource.toLowerCase().includes(search) ||
          log.resourceId?.toLowerCase().includes(search) ||
          JSON.stringify(log.metadata || {}).toLowerCase().includes(search)
      );
    }

    // 排序
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    filteredLogs.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal < bVal) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    const total = filteredLogs.length;

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    const pagedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: pagedLogs,
      total,
      offset,
      limit,
    };
  }

  /**
   * 按ID获取日志
   */
  public async getById(id: string): Promise<AuditLogEntry | null> {
    return this.logs.get(id) || null;
  }

  /**
   * 删除过期日志
   */
  public async deleteExpired(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deletedCount = 0;
    const expiredIds: string[] = [];

    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoffDate) {
        expiredIds.push(id);
      }
    }

    for (const id of expiredIds) {
      this.logs.delete(id);
      deletedCount++;
    }

    // 重建时间索引
    this.logsByTimestamp = Array.from(this.logs.values());
    this.sortByTimestamp();

    return deletedCount;
  }

  /**
   * 获取统计信息
   */
  public async getStats(filter?: {
    userId?: string;
    action?: AuditLogEntry['action'];
    status?: AuditLogEntry['status'];
  }): Promise<AuditLogStats> {
    let logs = [...this.logsByTimestamp];

    if (filter) {
      if (filter.userId) {
        logs = logs.filter((log) => log.userId === filter.userId);
      }
      if (filter.action) {
        logs = logs.filter((log) => log.action === filter.action);
      }
      if (filter.status) {
        logs = logs.filter((log) => log.status === filter.status);
      }
    }

    const totalLogs = logs.length;

    // 按操作类型统计
    const byAction: Record<AuditLogEntry['action'], number> = {
      CREATE: 0,
      READ: 0,
      UPDATE: 0,
      DELETE: 0,
      LOGIN: 0,
      LOGOUT: 0,
      EXPORT: 0,
      ADMIN: 0,
    };

    logs.forEach((log) => {
      byAction[log.action]++;
    });

    // 按状态统计
    const byStatus: Record<AuditLogEntry['status'], number> = {
      success: 0,
      failure: 0,
    };

    logs.forEach((log) => {
      byStatus[log.status]++;
    });

    // 按用户统计 (top 10)
    const userCounts = new Map<string, { username?: string; count: number }>();
    logs.forEach((log) => {
      const existing = userCounts.get(log.userId);
      if (existing) {
        existing.count++;
      } else {
        userCounts.set(log.userId, { username: log.username, count: 1 });
      }
    });

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 按资源类型统计
    const byResource: Record<string, number> = {};
    logs.forEach((log) => {
      const resource = log.resource;
      byResource[resource] = (byResource[resource] || 0) + 1;
    });

    return {
      totalLogs,
      byAction,
      byStatus,
      topUsers,
      byResource,
    };
  }

  /**
   * 清空所有日志
   */
  public async clear(): Promise<void> {
    this.logs.clear();
    this.logsByTimestamp = [];
  }

  /**
   * 按时间戳排序
   */
  private sortByTimestamp(): void {
    this.logsByTimestamp.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 强制执行最大日志数量限制
   */
  private enforceMaxLogs(): void {
    while (this.logs.size > this.maxLogs) {
      const oldest = this.logsByTimestamp.pop();
      if (oldest) {
        this.logs.delete(oldest.id);
      }
    }
  }
}
