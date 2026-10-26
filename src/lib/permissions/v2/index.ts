/**
 * v1.12.0 Fine-Grained RBAC System
 * 细粒度权限管理系统入口
 */

// Types
export * from './types'

// Engine
export { PermissionEngine, createPermissionEngine, defaultPermissionEngine } from './engine'

// Inheritance
export { InheritanceManager, createInheritanceManager, defaultInheritanceManager } from './inheritance'

// Audit
export { AuditLogManager, createAuditLogManager, defaultAuditLogManager } from './audit'

// Middleware
export {
  withFineGrainedPermission,
  withBatchPermissions,
  withOptionalPermission,
} from './middleware'

// Repository
export {
  initializeFineGrainedTables,
  getPermissions,
  getPermissionsByResourceAction,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionById,
  getEnhancedRoles,
  getEnhancedRoleWithComputedPermissions,
  createEnhancedRole,
  updateEnhancedRole,
  deleteEnhancedRole,
  getEnhancedRoleById,
  getUserPermissionContextV2,
  assignRoleToUser,
  removeRoleFromUser,
} from './repository-v2'
