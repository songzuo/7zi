/**
 * RBAC Optimization - Index File
 *
 * 统一导出 RBAC 优化模块的所有功能
 */

// RBAC Cache
export {
  RBACCache,
  rbacCache,
  cacheUserPermissions,
  getCachedPermissions,
  invalidatePermissionCache,
  invalidatePermissionCacheByRole,
  getCacheStats,
  type CacheConfig,
  type CacheStats,
} from './rbac-cache'

// Permission Inheritance
export {
  PermissionInheritance,
  permissionInheritance,
  calculateInheritedPermissions,
  calculatePermissionsForRoles,
  checkOverride,
  applyPermissionOverrides,
  getSubRoles,
  getParentRoles,
  InheritanceStrategy,
  type PermissionOverride,
  type InheritanceResult,
} from './permission-inheritance'

// Audit Logger
export {
  AuditLogger,
  auditLogger,
  logPermissionChange,
  logRoleAssignment,
  logPermissionCheck,
  logSensitiveOperation,
  logSecurityEvent,
  generateAuditReport,
  readAuditLogs,
  readSensitiveLogs,
  readSecurityLogs,
  AuditEventType,
  AuditEventLevel,
  type AuditEvent,
  type AuditReport,
  type ReadOptions,
  MemoryAuditLogStorage,
  type AuditLogStorage,
} from './audit-logger'
