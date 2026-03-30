/**
 * Authentication Middleware Module
 * 
 * Re-exports authentication-related middleware functions for backward compatibility.
 * This module provides a unified API for authentication middleware.
 * 
 * @deprecated Use `@/lib/auth/middleware-rbac` directly for new code
 */

export {
  withAuth,
  authenticateRequest,
  RATE_LIMIT_CONFIG,
} from './auth';

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

// For backward compatibility with tests
export const mockAuthMiddleware = {
  withAuth: (request: any, handler: any) => handler(request, 'mock-user-id'),
  RATE_LIMIT_CONFIG: {
    windowMs: 60000,
    maxRequests: 100,
  },
};
