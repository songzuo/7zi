/**
 * Multi-Tenant Module Index
 * 多租户模块统一入口
 */

// Types
export * from './types'

// Services
export { TenantService, tenantService } from './service'

// Middleware
export {
  tenantMiddleware,
  requirePermission,
  requireRole,
  checkQuota,
  auditMiddleware,
  type TenantRequest,
} from './middleware'
