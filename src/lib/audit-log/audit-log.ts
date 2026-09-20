/**
 * 审计日志系统 - 核心服务
 * @module lib/audit-log/audit-log
 * @version 1.10.0
 */

import type {
  AuditEvent,
  AuditQueryOptions,
  AuditQueryResult,
  AuditAggregationOptions,
  AuditAggregationResult,
  AuditTrendResult,
  UserActivityStats,
  ResourceAccessStats,
  ComplianceReportConfig,
  ComplianceReport,
  AuditExportOptions,
  AuditImportResult,
  AuditLogStorage,
  AuditLogProcessor,
  AuditUserContext,
  AuditRequestContext,
  AuditResource,
  AuditChangeDetail,
  AuditLogLevel,
  AuditEventCategory,
  AuditActionType,
  AuditResultStatus,
  AuditSeverity,
} from './types.js';
import { getConfigManager } from './config.js';
import { AuditEventBuilder } from './event-builder.js';
import { AuditQueryService } from './query-service.js';
import { AuditAnalyticsService } from './analytics-service.js';
import { AuditComplianceService } from './compliance-service.js';
import { AuditExportService } from './export-service.js';
import { AuditStorageFactory } from './storage/storage-factory.js';
import { AuditSensitiveDataHandler } from './sensitive-data-handler.js';
import { AuditSignatureHandler } from './signature-handler.js';

// ============================================================================
// 审计日志服务
// ============================================================================

/**
 * 审计日志核心服务
 */
export class AuditLogService {
  private storage: AuditLogStorage;
  private queryService: AuditQueryService;
  private analyticsService: AuditAnalyticsService;
  private complianceService: AuditComplianceService;
  private exportService: AuditExportService;
  private sensitiveDataHandler: AuditSensitiveDataHandler;
  private signatureHandler: AuditSignatureHandler;
  private processors: AuditLogProcessor[] = [];
  private eventBuffer: AuditEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(storage?: AuditLogStorage) {
    const config = getConfigManager().getConfig();

    // 初始化存储
    this.storage = storage || AuditStorageFactory.createDefault();

    // 初始化各个服务
    this.queryService = new AuditQueryService(this.storage);
    this.analyticsService = new AuditAnalyticsService(this.storage);
    this.complianceService = new AuditComplianceService(this.storage);
    this.exportService = new AuditExportService(this.storage);

    // 初始化处理器
    this.sensitiveDataHandler = new AuditSensitiveDataHandler(config.sensitiveFields);
    this.signatureHandler = new AuditSignatureHandler(config.enableSigning, config.signingKey);

    // 如果启用异步写入，启动批量处理
    if (config.asyncWrite) {
      this.startBatchProcessing(config.batchSize, config.batchInterval);
    }
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const config = getConfigManager().getConfig();

    if (!config.enabled) {
      console.info('Audit log service is disabled');
      return;
    }

    // 验证配置
    const validation = getConfigManager().validateConfig();
    if (!validation.valid) {
      throw new Error(`Invalid audit config: ${validation.errors.join(', ')}`);
    }

    // 初始化存储
    await this.storage.write({
      id: this.generateId(),
      timestamp: new Date(),
      level: 'info',
      category: 'system',
      action: 'system_start',
      status: 'success',
      severity: 'low',
      message: 'Audit log service initialized',
      details: { serviceName: config.serviceName },
    });

    this.isInitialized = true;
    console.info('Audit log service initialized successfully');
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    // 刷新缓冲区
    if (this.eventBuffer.length > 0) {
      await this.flushBuffer();
    }

    // 清除定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // 关闭存储
    await this.storage.close();

    this.isInitialized = false;
    console.info('Audit log service shutdown complete');
  }

  /**
   * 记录审计事件
   */
  public async log(event: Partial<AuditEvent>): Promise<string> {
    const config = getConfigManager().getConfig();

    if (!config.enabled) {
      return '';
    }

    // 检查日志级别
    if (event.level && !getConfigManager().shouldLog(event.level)) {
      return '';
    }

    // 构建完整事件
    const builder = new AuditEventBuilder()
      .withId(this.generateId())
      .withTimestamp(new Date())
      .withLevel(event.level || 'info')
      .withCategory(event.category || 'system')
      .withAction(event.action || 'custom')
      .withStatus(event.status || 'success')
      .withSeverity(event.severity || 'low')
      .withMessage(event.message || 'Audit event')
      .withUser(event.user)
      .withRequest(event.request)
      .withResource(event.resource)
      .withChanges(event.changes)
      .withError(event.error)
      .withCorrelationId(event.correlationId)
      .withParentId(event.parentId)
      .withTags(event.tags)
      .withMetadata(event.metadata);

    // 添加服务名称
    builder.withMetadata({ serviceName: config.serviceName });

    let auditEvent = builder.build();

    // 处理敏感数据
    auditEvent = this.sensitiveDataHandler.maskSensitiveData(auditEvent);

    // 应用自定义处理器
    for (const processor of this.processors) {
      auditEvent = await processor.process(auditEvent);
    }

    // 签名
    if (config.enableSigning) {
      auditEvent = this.signatureHandler.sign(auditEvent);
    }

    // 写入存储
    if (config.asyncWrite) {
      this.addToBuffer(auditEvent);
    } else {
      await this.storage.write(auditEvent);
    }

    return auditEvent.id;
  }

  /**
   * 记录用户操作
   */
  public async logUserAction(
    action: AuditActionType,
    user: AuditUserContext,
    resource?: AuditResource,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: 'info',
      category: 'user',
      action,
      status: 'success',
      severity: 'medium',
      message: `User action: ${action}`,
      user,
      resource,
      details,
    });
  }

  /**
   * 记录系统事件
   */
  public async logSystemEvent(
    action: AuditActionType,
    message: string,
    level: AuditLogLevel = 'info',
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level,
      category: 'system',
      action,
      status: 'success',
      severity: level === 'error' || level === 'critical' ? 'high' : 'low',
      message,
      details,
    });
  }

  /**
   * 记录业务事件
   */
  public async logBusinessEvent(
    action: AuditActionType,
    user: AuditUserContext,
    resource: AuditResource,
    status: AuditResultStatus,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: status === 'failure' ? 'warn' : 'info',
      category: 'business',
      action,
      status,
      severity: status === 'failure' ? 'medium' : 'low',
      message: `Business event: ${action}`,
      user,
      resource,
      details,
    });
  }

  /**
   * 记录安全事件
   */
  public async logSecurityEvent(
    action: AuditActionType,
    user?: AuditUserContext,
    request?: AuditRequestContext,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: 'warn',
      category: 'security',
      action,
      status: 'success',
      severity: 'high',
      message: `Security event: ${action}`,
      user,
      request,
      details,
    });
  }

  /**
   * 记录登录事件
   */
  public async logLogin(
    user: AuditUserContext,
    request: AuditRequestContext,
    success: boolean,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: success ? 'info' : 'warn',
      category: 'system',
      action: success ? 'login' : 'login_failed',
      status: success ? 'success' : 'failure',
      severity: success ? 'low' : 'medium',
      message: success ? 'User logged in' : 'User login failed',
      user,
      request,
      details,
    });
  }

  /**
   * 记录登出事件
   */
  public async logLogout(
    user: AuditUserContext,
    request: AuditRequestContext
  ): Promise<string> {
    return this.log({
      level: 'info',
      category: 'system',
      action: 'logout',
      status: 'success',
      severity: 'low',
      message: 'User logged out',
      user,
      request,
    });
  }

  /**
   * 记录权限变更
   */
  public async logPermissionChange(
    action: 'permission_grant' | 'permission_revoke' | 'role_assign' | 'role_remove',
    user: AuditUserContext,
    targetUser: AuditUserContext,
    details: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: 'warn',
      category: 'security',
      action,
      status: 'success',
      severity: 'high',
      message: `Permission change: ${action}`,
      user,
      details: {
        ...details,
        targetUserId: targetUser.userId,
        targetUsername: targetUser.username,
      },
    });
  }

  /**
   * 记录数据操作
   */
  public async logDataOperation(
    action: 'create' | 'read' | 'update' | 'delete',
    user: AuditUserContext,
    resource: AuditResource,
    changes?: AuditChangeDetail[],
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log({
      level: action === 'delete' ? 'warn' : 'info',
      category: 'data',
      action,
      status: 'success',
      severity: action === 'delete' ? 'medium' : 'low',
      message: `Data operation: ${action}`,
      user,
      resource,
      changes,
      details,
    });
  }

  /**
   * 查询审计日志
   */
  public async query(options: AuditQueryOptions): Promise<AuditQueryResult> {
    return this.queryService.query(options);
  }

  /**
   * 按ID获取事件
   */
  public async getById(id: string): Promise<AuditEvent | null> {
    return this.storage.getById(id);
  }

  /**
   * 聚合统计
   */
  public async aggregate(
    options: AuditAggregationOptions
  ): Promise<AuditAggregationResult> {
    return this.analyticsService.aggregate(options);
  }

  /**
   * 趋势分析
   */
  public async getTrends(
    timeRange: { start: Date; end: Date },
    interval: 'hour' | 'day' | 'week' = 'day'
  ): Promise<AuditTrendResult> {
    return this.analyticsService.getTrends(timeRange, interval);
  }

  /**
   * 用户活动统计
   */
  public async getUserActivityStats(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<UserActivityStats> {
    return this.analyticsService.getUserActivityStats(userId, timeRange);
  }

  /**
   * 资源访问统计
   */
  public async getResourceAccessStats(
    resourceType: string,
    resourceId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ResourceAccessStats> {
    return this.analyticsService.getResourceAccessStats(resourceType, resourceId, timeRange);
  }

  /**
   * 生成合规报告
   */
  public async generateComplianceReport(
    config: ComplianceReportConfig
  ): Promise<ComplianceReport> {
    return this.complianceService.generateReport(config);
  }

  /**
   * 导出审计日志
   */
  public async export(options: AuditExportOptions): Promise<string> {
    return this.exportService.export(options);
  }

  /**
   * 导入审计日志
   */
  public async import(
    inputPath: string,
    format: 'json' | 'csv',
    options?: { overwrite?: boolean; verifySignature?: boolean; skipInvalid?: boolean }
  ): Promise<AuditImportResult> {
    return this.exportService.import(inputPath, format, options);
  }

  /**
   * 添加自定义处理器
   */
  public addProcessor(processor: AuditLogProcessor): void {
    this.processors.push(processor);
  }

  /**
   * 移除自定义处理器
   */
  public removeProcessor(processorName: string): void {
    this.processors = this.processors.filter((p) => p.name !== processorName);
  }

  /**
   * 获取存储统计
   */
  public async getStorageStats() {
    return this.storage.getStats();
  }

  /**
   * 清理过期数据
   */
  public async cleanup(): Promise<number> {
    return this.storage.cleanup();
  }

  /**
   * 验证事件签名
   */
  public verifySignature(event: AuditEvent): boolean {
    return this.signatureHandler.verify(event);
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
  private addToBuffer(event: AuditEvent): void {
    this.eventBuffer.push(event);

    const config = getConfigManager().getConfig();
    if (config.batchSize && this.eventBuffer.length >= config.batchSize) {
      this.flushBuffer().catch((error) => {
        console.error('Failed to flush audit log buffer:', error);
      });
    }
  }

  /**
   * 刷新缓冲区
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await this.storage.writeBatch(events);
    } catch (error) {
      console.error('Failed to write audit log batch:', error);
      // 重新加入缓冲区
      this.eventBuffer.unshift(...events);
      throw error;
    }
  }

  /**
   * 启动批量处理
   */
  private startBatchProcessing(batchSize?: number, batchInterval?: number): void {
    const config = getConfigManager().getConfig();
    const size = batchSize || config.batchSize || 100;
    const interval = batchInterval || config.batchInterval || 5000;

    this.batchTimer = setInterval(() => {
      this.flushBuffer().catch((error) => {
        console.error('Failed to flush audit log buffer on interval:', error);
      });
    }, interval);
  }
}

// ============================================================================
// 全局实例
// ============================================================================

/**
 * 全局审计日志服务实例
 */
let globalAuditLogService: AuditLogService | null = null;

/**
 * 获取全局审计日志服务
 */
export function getAuditLogService(): AuditLogService {
  if (!globalAuditLogService) {
    globalAuditLogService = new AuditLogService();
  }
  return globalAuditLogService;
}

/**
 * 初始化全局审计日志服务
 */
export async function initializeAuditLog(): Promise<void> {
  const service = getAuditLogService();
  await service.initialize();
}

/**
 * 关闭全局审计日志服务
 */
export async function shutdownAuditLog(): Promise<void> {
  if (globalAuditLogService) {
    await globalAuditLogService.shutdown();
    globalAuditLogService = null;
  }
}

/**
 * 重置全局审计日志服务 (主要用于测试)
 */
export function resetAuditLogService(): void {
  globalAuditLogService = null;
}