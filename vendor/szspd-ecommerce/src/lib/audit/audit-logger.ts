/**
 * 审计日志服务 - 核心实现
 * @module lib/audit/audit-logger
 * @version 1.12.0
 */

import type {
  AuditLogEntry,
  AuditAction,
  AuditStatus,
  AuditLogFilter,
  AuditLogQueryOptions,
  AuditLogQueryResult,
  AuditLogExportOptions,
  AuditLogStats,
  IAuditLogStorage,
} from './types';
import { MemoryAuditStorage } from './storage/memory-storage';

// ============================================================================
// 审计日志服务
// ============================================================================

/**
 * 审计日志服务类
 */
export class AuditLogger {
  private storage: IAuditLogStorage;
  private buffer: AuditLogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private config = {
    enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10),
    asyncWrite: process.env.AUDIT_LOG_ASYNC_WRITE !== 'false',
    batchSize: parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '50', 10),
    batchInterval: parseInt(process.env.AUDIT_LOG_BATCH_INTERVAL || '3000', 10),
    maxLogs: parseInt(process.env.AUDIT_LOG_MAX_LOGS || '10000', 10),
  };

  constructor(storage?: IAuditLogStorage) {
    this.storage = storage || new MemoryAuditStorage(this.config.maxLogs);

    // 启动批量处理
    if (this.config.asyncWrite) {
      this.startBatchProcessing();
    }
  }

  /**
   * 记录审计日志
   */
  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    };

    if (this.config.asyncWrite) {
      this.addToBuffer(logEntry);
    } else {
      await this.storage.add(logEntry);
    }

    return logEntry.id;
  }

  /**
   * 记录创建操作
   */
  public async logCreate(
    userId: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'CREATE',
      resource,
      resourceId,
      status: 'success',
      metadata,
    });
  }

  /**
   * 记录读取操作
   */
  public async logRead(
    userId: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'READ',
      resource,
      resourceId,
      status: 'success',
      metadata,
    });
  }

  /**
   * 记录更新操作
   */
  public async logUpdate(
    userId: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'UPDATE',
      resource,
      resourceId,
      status: 'success',
      metadata,
    });
  }

  /**
   * 记录删除操作
   */
  public async logDelete(
    userId: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'DELETE',
      resource,
      resourceId,
      status: 'success',
      metadata,
    });
  }

  /**
   * 记录登录操作
   */
  public async logLogin(
    userId: string,
    username?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.log({
      userId,
      username,
      action: 'LOGIN',
      resource: 'session',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录登出操作
   */
  public async logLogout(
    userId: string,
    username?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.log({
      userId,
      username,
      action: 'LOGOUT',
      resource: 'session',
      status: 'success',
      ipAddress,
      userAgent,
    });
  }

  /**
   * 记录导出操作
   */
  public async logExport(
    userId: string,
    resource: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'EXPORT',
      resource,
      status: 'success',
      metadata,
    });
  }

  /**
   * 记录管理操作
   */
  public async logAdmin(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      userId,
      action: 'ADMIN',
      resource,
      resourceId,
      status: 'success',
      metadata: { ...metadata, adminAction: action },
    });
  }

  /**
   * 查询审计日志
   */
  public async query(options: AuditLogQueryOptions): Promise<AuditLogQueryResult> {
    return this.storage.query(options);
  }

  /**
   * 按ID获取日志
   */
  public async getById(id: string): Promise<AuditLogEntry | null> {
    return this.storage.getById(id);
  }

  /**
   * 获取统计信息
   */
  public async getStats(filter?: AuditLogFilter): Promise<AuditLogStats> {
    return this.storage.getStats(filter);
  }

  /**
   * 导出审计日志
   */
  public async export(options: AuditLogExportOptions): Promise<string> {
    const logs = await this.storage.query({
      ...options,
      startTime: options.startTime,
      endTime: options.endTime,
      limit: options.maxRecords,
    });

    if (options.format === 'json') {
      return JSON.stringify(logs.logs, null, 2);
    } else if (options.format === 'csv') {
      return this.exportToCsv(logs.logs);
    }

    throw new Error(`Unsupported export format: ${options.format}`);
  }

  /**
   * 删除过期日志
   */
  public async deleteExpired(): Promise<number> {
    return this.storage.deleteExpired(this.config.retentionDays);
  }

  /**
   * 清空所有日志
   */
  public async clear(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // 刷新缓冲区
    if (this.buffer.length > 0) {
      await this.flushBuffer();
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * 添加到缓冲区
   */
  private addToBuffer(entry: AuditLogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= this.config.batchSize) {
      this.flushBuffer().catch((error) => {
        console.error('Failed to flush audit log buffer:', error);
      });
    }
  }

  /**
   * 刷新缓冲区
   */
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      await this.storage.addBatch(logs);
    } catch (error) {
      console.error('Failed to write audit log batch:', error);
      // 重新加入缓冲区
      this.buffer.unshift(...logs);
      throw error;
    }
  }

  /**
   * 启动批量处理
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
        console.error('Failed to flush audit log buffer on interval:', error);
      });
    }, this.config.batchInterval);
  }

  /**
   * 导出为CSV格式
   */
  private exportToCsv(logs: AuditLogEntry[]): string {
    const headers = ['id', 'userId', 'username', 'action', 'resource', 'resourceId', 'status', 'ipAddress', 'userAgent', 'timestamp'];
    const rows = logs.map((log) => [
      log.id,
      log.userId,
      log.username || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.status,
      log.ipAddress || '',
      log.userAgent || '',
      log.timestamp.toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }
}

// ============================================================================
// 全局实例
// ============================================================================

/**
 * 全局审计日志服务实例
 */
let globalAuditLogger: AuditLogger | null = null;

/**
 * 获取全局审计日志服务
 */
export function getAuditLogger(): AuditLogger {
  if (!globalAuditLogger) {
    globalAuditLogger = new AuditLogger();
  }
  return globalAuditLogger;
}

/**
 * 重置全局审计日志服务 (主要用于测试)
 */
export function resetAuditLogger(): void {
  globalAuditLogger = null;
}
