/**
 * Multi-Tenant Authentication Module
 * 多租户认证模块
 * 
 * 导出所有租户认证相关的类型、服务和中间件
 */

// Types
export * from './types'

// Context
export {
  TenantContextManager,
  getTenantContext,
  getRequiredTenantContext,
  getTenantId,
  getRequiredTenantId,
  getUserId,
  isTenantOwner,
  isTenantAdmin,
  hasTenantPermission,
  requireTenantPermission,
} from './context'

// Middleware
export {
  generateTenantToken,
  verifyTenantToken,
  tenantAuthMiddleware,
  requireTenantPermission as requirePermissionMiddleware,
  requireTenantRole,
  requireAdminMiddleware,
  requireOwnerMiddleware,
  checkUserPermission,
  getUserTenantContexts,
} from './middleware'

// Cross-Tenant Access Control
export {
  CrossTenantAccessControl,
  crossTenantAccessControl,
} from './cross-tenant'

// Service
export {
  TenantAuthService,
  tenantAuthService,
} from './service'

// Re-export tenant types for convenience
export {
  TenantStatus,
  TenantPlan,
  TenantIsolationMode,
  TenantMemberRole,
  TenantMemberStatus,
  type Tenant,
  type TenantMember,
  type TenantSettings,
  type TenantQuota,
  type TenantStats,
} from '../../tenant/types'