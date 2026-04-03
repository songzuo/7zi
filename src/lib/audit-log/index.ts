/**
 * 审计日志系统 - 入口模块
 * @module lib/audit-log
 * @version 1.10.0
 */

// 核心服务
export { AuditLogService, getAuditLogService, initializeAuditLog, shutdownAuditLog } from './audit-log.js';

// 类型定义
export type {
  AuditEvent,
  AuditLogLevel,
  AuditEventCategory,
  AuditActionType,
  AuditResultStatus,
  AuditSeverity,
  AuditUserContext,
  AuditRequestContext,
  AuditResource,
  AuditChangeDetail,
  SensitiveFieldConfig,
  AuditQueryOptions,
  AuditQueryResult,
  AuditQueryFilter,
  AuditSortOption,
  AuditPagination,
  AuditAggregationOptions,
  AuditAggregationResult,
  AuditAggregationItem,
  AuditTrendResult,
  AuditTrendPoint,
  UserActivityStats,
  ResourceAccessStats,
  ComplianceReport,
  ComplianceReportConfig,
  ComplianceReportSummary,
  ComplianceReportType,
  AuditExportOptions,
  AuditImportResult,
  AuditLogConfig,
  AuditLogStorage,
  AuditLogProcessor,
  AuditStorageStats,
  RetentionPolicy,
} from './types.js';

// 配置管理
export { AuditConfigManager, getConfigManager, getCurrentConfig, updateCurrentConfig } from './config.js';
export { DEFAULT_AUDIT_CONFIG } from './config.js';

// 事件构建器
export { AuditEventBuilder, createAuditEvent, quickAuditEvent } from './event-builder.js';

// 存储相关
export { AuditStorageFactory } from './storage/storage-factory.js';
export type { StorageConfig, StorageType } from './storage/storage-factory.js';
export { FileAuditStorage } from './storage/file-storage.js';
export { MemoryAuditStorage } from './storage/memory-storage.js';

// 查询服务
export { AuditQueryService, QueryBuilder } from './query-service.js';

// 分析服务
export { AuditAnalyticsService } from './analytics-service.js';

// 合规服务
export { AuditComplianceService } from './compliance-service.js';

// 导出服务
export { AuditExportService } from './export-service.js';

// 敏感数据处理
export { AuditSensitiveDataHandler } from './sensitive-data-handler.js';

// 签名处理
export { AuditSignatureHandler } from './signature-handler.js';