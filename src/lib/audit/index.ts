/**
 * 审计日志系统 - 入口文件
 * @module lib/audit
 * @version 1.12.0
 */

// 核心
export { AuditLogger, getAuditLogger, resetAuditLogger } from './audit-logger';

// 存储实现
export { MemoryAuditStorage } from './storage/memory-storage';

// 中间件
export {
  createAuditMiddleware,
  wrapResponseForAudit,
  extractUserIdFromToken,
  extractUsernameFromToken,
  auditMiddleware,
  defaultAuditMiddlewareOptions,
} from './middleware';

// WebSocket
export {
  AuditWebSocketService,
  getAuditWebSocketService,
  shutdownAuditWebSocketService,
  resetAuditWebSocketService,
} from './websocket';

// 类型
export type {
  AuditLogEntry,
  AuditAction,
  AuditStatus,
  AuditLogFilter,
  AuditLogQueryOptions,
  AuditLogQueryResult,
  AuditLogExportOptions,
  AuditLogStats,
  IAuditLogStorage,
  AuditMiddlewareOptions,
  AuditWsMessageType,
  AuditWsMessage,
  AuditWsStats,
  AuditWsError,
} from './types';
