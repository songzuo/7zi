/**
 * Authentication Middleware - Auth API Helper Module
 *
 * This module provides authentication middleware functions for API routes.
 * It re-exports functions from the main middleware module and the RBAC system.
 *
 * @description
 * This file serves as a compatibility layer for code that imports from
 * `@/middleware/auth.middleware`. All actual implementations are in
 * the RBAC middleware and main auth modules.
 */

// Re-export everything from the main auth middleware
export {
  withAuth,
  authenticateRequest,
  RATE_LIMIT_CONFIG,
} from './auth';

// Re-export RBAC middleware functions
export {
  withUserAuth,
  withPermissions,
  withAnyPermission,
  withRole,
  withAnyRole,
  withAdmin,
  withManagerOrAdmin,
  withOptionalAuth,
  type RBACUserContext,
} from '@/lib/auth/middleware-rbac';

// Re-export types
export type {
  UserContext,
  UserRole,
} from '@/lib/auth/types';
