/**
 * 审计日志模块
 * @module config-center/audit-logger
 * @version 1.10.0
 */

import {
  ConfigAuditLog,
  ConfigChangeAction,
  ConfigEnvironment,
} from './types';
import { StorageAdapter } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 审计日志查询选项
 */
export interface AuditLogQuery {
  /** 操作类型过滤 */
  action?: ConfigChangeAction;
  /** 资源类型过滤 */
  resourceType?: ConfigAuditLog['resourceType'];
  /** 资源ID过滤 */
  resourceId?: string;
  /** 操作者ID过滤 */
  operatorId?: string;
  /** 操作者类型过滤 */
  operatorType?: ConfigAuditLog['operatorType'];
  /** 环境过滤 */
  environment?: ConfigEnvironment;
  /** 结果过滤 */
  result?: ConfigAuditLog['result'];
  /** 时间范围 */
  timeRange?: {
    start: Date;
    end: Date;
  };
  /** 分页 */
  pagination?: {
    offset: number;
    limit: number;
  };
  /** 排序 */
  orderBy?: {
    field: 'timestamp' | 'action' | 'resourceName';
    direction: 'asc' | 'desc';
  };
}

/**
 * 审计日志统计
 */
export interface AuditLogStats {
  /** 总日志数 */
  totalLogs: number;
  /** 按操作类型统计 */
  byAction: Record<ConfigChangeAction, number>;
  /** 按资源类型统计 */
  byResourceType: Record<string, number>;
  /** 按操作者统计 */
  byOperator: Record<string, number>;
  /** 按环境统计 */
  byEnvironment: Record<ConfigEnvironment, number>;
  /** 成功率 */
  successRate: number;
  /** 最活跃的操作者 */
  topOperators: Array<{
    operatorId: string;
    count: number;
  }>;
}

/**
 * 审计日志器
 * 
 * 提供配置操作审计日志记录、查询、统计等功能
 */
export class AuditLogger {
  private storage: StorageAdapter;
  private logs: Map<string, ConfigAuditLog> = new Map();
  private initialized = false;
  private maxLogs = 100000; // 最大日志数量

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * 初始化审计日志器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  /**
   * 记录审计日志
   */
  async log(entry: Omit<ConfigAuditLog, 'id'>): Promise<ConfigAuditLog> {
    const log: ConfigAuditLog = {
      ...entry,
      id: uuidv4(),
    };

    this.logs.set(log.id, log);

    // 清理旧日志
    if (this.logs.size > this.maxLogs) {
      await this.cleanupOldLogs();
    }

    return log;
  }

  /**
   * 批量记录审计日志
   */
  async logBatch(entries: Array<Omit<ConfigAuditLog, 'id'>>): Promise<ConfigAuditLog[]> {
    const logs: ConfigAuditLog[] = [];

    for (const entry of entries) {
      const log = await this.log(entry);
      logs.push(log);
    }

    return logs;
  }

  /**
   * 查询审计日志
   */
  async query(query: AuditLogQuery): Promise<ConfigAuditLog[]> {
    let logs = Array.from(this.logs.values());

    // 应用过滤条件
    if (query.action) {
      logs = logs.filter(log => log.action === query.action);
    }

    if (query.resourceType) {
      logs = logs.filter(log => log.resourceType === query.resourceType);
    }

    if (query.resourceId) {
      logs = logs.filter(log => log.resourceId === query.resourceId);
    }

    if (query.operatorId) {
      logs = logs.filter(log => log.operatorId === query.operatorId);
    }

    if (query.operatorType) {
      logs = logs.filter(log => log.operatorType === query.operatorType);
    }

    if (query.environment) {
      logs = logs.filter(log => log.environment === query.environment);
    }

    if (query.result) {
      logs = logs.filter(log => log.result === query.result);
    }

    if (query.timeRange) {
      logs = logs.filter(log => {
        const timestamp = log.timestamp.getTime();
        return (
          timestamp >= query.timeRange!.start.getTime() &&
          timestamp <= query.timeRange!.end.getTime()
        );
      });
    }

    // 排序
    if (query.orderBy) {
      logs.sort((a, b) => {
        let comparison = 0;

        switch (query.orderBy!.field) {
          case 'timestamp':
            comparison = a.timestamp.getTime() - b.timestamp.getTime();
            break;
          case 'action':
            comparison = a.action.localeCompare(b.action);
            break;
          case 'resourceName':
            comparison = a.resourceName.localeCompare(b.resourceName);
            break;
        }

        return query.orderBy!.direction === 'desc' ? -comparison : comparison;
      });
    } else {
      // 默认按时间倒序
      logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // 分页
    if (query.pagination) {
      logs = logs.slice(query.pagination.offset, query.pagination.offset + query.pagination.limit);
    }

    return logs;
  }

  /**
   * 获取审计日志
   */
  async get(id: string): Promise<ConfigAuditLog | null> {
    return this.logs.get(id) || null;
  }

  /**
   * 获取资源的历史日志
   */
  async getResourceHistory(
    resourceType: ConfigAuditLog['resourceType'],
    resourceId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ConfigAuditLog[]> {
    return await this.query({
      resourceType,
      resourceId,
      pagination: {
        offset: options.offset || 0,
        limit: options.limit || 50,
      },
      orderBy: {
        field: 'timestamp',
        direction: 'desc',
      },
    });
  }

  /**
   * 获取操作者的历史日志
   */
  async getOperatorHistory(
    operatorId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ConfigAuditLog[]> {
    return await this.query({
      operatorId,
      pagination: {
        offset: options.offset || 0,
        limit: options.limit || 50,
      },
      orderBy: {
        field: 'timestamp',
        direction: 'desc',
      },
    });
  }

  /**
   * 获取统计信息
   */
  async getStats(options: {
    timeRange?: {
      start: Date;
      end: Date;
    };
  } = {}): Promise<AuditLogStats> {
    let logs = Array.from(this.logs.values());

    // 应用时间范围
    if (options.timeRange) {
      logs = logs.filter(log => {
        const timestamp = log.timestamp.getTime();
        return (
          timestamp >= options.timeRange!.start.getTime() &&
          timestamp <= options.timeRange!.end.getTime()
        );
      });
    }

    // 统计
    const byAction: Record<ConfigChangeAction, number> = {
      create: 0,
      update: 0,
      delete: 0,
      rollback: 0,
      import: 0,
    };

    const byResourceType: Record<string, number> = {};
    const byOperator: Record<string, number> = {};
    const byEnvironment: Record<ConfigEnvironment, number> = {
      development: 0,
      staging: 0,
      production: 0,
      test: 0,
    };

    let successCount = 0;

    for (const log of logs) {
      // 按操作类型
      byAction[log.action]++;

      // 按资源类型
      byResourceType[log.resourceType] = (byResourceType[log.resourceType] || 0) + 1;

      // 按操作者
      byOperator[log.operatorId] = (byOperator[log.operatorId] || 0) + 1;

      // 按环境
      if (log.environment) {
        byEnvironment[log.environment]++;
      }

      // 成功率
      if (log.result === 'success') {
        successCount++;
      }
    }

    // 最活跃的操作者
    const topOperators = Object.entries(byOperator)
      .map(([operatorId, count]) => ({ operatorId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      byAction,
      byResourceType,
      byOperator,
      byEnvironment,
      successRate: logs.length > 0 ? successCount / logs.length : 0,
      topOperators,
    };
  }

  /**
   * 导出审计日志
   */
  async exportLogs(
    query: AuditLogQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await this.query(query);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV 格式
    const headers = [
      'id',
      'action',
      'resourceType',
      'resourceId',
      'resourceName',
      'operatorId',
      'operatorType',
      'timestamp',
      'result',
      'environment',
    ].join(',');

    const rows = logs.map(log => {
      const values = [
        log.id,
        log.action,
        log.resourceType,
        log.resourceId,
        log.resourceName,
        log.operatorId,
        log.operatorType,
        log.timestamp.toISOString(),
        log.result,
        log.environment || '',
      ];
      return values.map(v => `"${v}"`).join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * 清理旧日志
   */
  private async cleanupOldLogs(): Promise<number> {
    const logs = Array.from(this.logs.entries());
    
    // 按时间排序
    logs.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

    // 删除最旧的日志
    const toDelete = logs.slice(0, logs.length - this.maxLogs);
    let deleted = 0;

    for (const [id] of toDelete) {
      this.logs.delete(id);
      deleted++;
    }

    return deleted;
  }

  /**
   * 清理指定时间之前的日志
   */
  async cleanupBefore(date: Date): Promise<number> {
    let deleted = 0;

    for (const [id, log] of this.logs) {
      if (log.timestamp < date) {
        this.logs.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * 获取日志数量
   */
  count(): number {
    return this.logs.size;
  }

  /**
   * 清空所有日志
   */
  clear(): void {
    this.logs.clear();
  }

  /**
   * 搜索日志
   */
  async search(
    searchTerm: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ConfigAuditLog[]> {
    const term = searchTerm.toLowerCase();
    let logs = Array.from(this.logs.values());

    // 搜索
    logs = logs.filter(log => {
      return (
        log.resourceName.toLowerCase().includes(term) ||
        log.resourceId.toLowerCase().includes(term) ||
        log.operatorId.toLowerCase().includes(term) ||
        (log.errorMessage && log.errorMessage.toLowerCase().includes(term))
      );
    });

    // 排序
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 分页
    if (options.limit) {
      logs = logs.slice(options.offset || 0, (options.offset || 0) + options.limit);
    }

    return logs;
  }

  /**
   * 获取最近的错误日志
   */
  async getRecentErrors(limit: number = 50): Promise<ConfigAuditLog[]> {
    return await this.query({
      result: 'failed',
      pagination: {
        offset: 0,
        limit,
      },
      orderBy: {
        field: 'timestamp',
        direction: 'desc',
      },
    });
  }

  /**
   * 获取操作摘要
   */
  async getOperationSummary(
    operatorId: string,
    timeRange?: {
      start: Date;
      end: Date;
    }
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationsByType: Record<ConfigChangeAction, number>;
    operationsByResource: Record<string, number>;
  }> {
    const logs = await this.query({
      operatorId,
      timeRange,
    });

    const operationsByType: Record<ConfigChangeAction, number> = {
      create: 0,
      update: 0,
      delete: 0,
      rollback: 0,
      import: 0,
    };

    const operationsByResource: Record<string, number> = {};
    let successfulOperations = 0;
    let failedOperations = 0;

    for (const log of logs) {
      operationsByType[log.action]++;
      operationsByResource[log.resourceType] = (operationsByResource[log.resourceType] || 0) + 1;

      if (log.result === 'success') {
        successfulOperations++;
      } else {
        failedOperations++;
      }
    }

    return {
      totalOperations: logs.length,
      successfulOperations,
      failedOperations,
      operationsByType,
      operationsByResource,
    };
  }
}