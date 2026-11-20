/**
 * Authentication Middleware - Auth API Helper Module
 *
 * This module provides authentication middleware functions for API routes.
 * It re-exports functions from main middleware module and RBAC system.
 *
 * @description
 * This file serves as a compatibility layer for code that imports from
 * `@/middleware/auth.middleware`. All actual implementations are in
 * the RBAC middleware and main auth modules.
 */

import { NextRequest, NextResponse } from 'next/server'

// Re-export everything from main auth middleware
export { withAuth, authenticateRequest, RATE_LIMIT_CONFIG } from './auth'

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
} from '@/lib/auth/middleware-rbac'

// Re-export types
export type { UserContext, UserRole } from '@/lib/auth/types'

/**
 * authMiddleware - Backward compatibility function
 *
 * Validates authentication and returns response object with status code.
 * Used by legacy code that expects `authMiddleware(request)` to return
 * a NextResponse with status property.
 *
 * @param request - Next.js request object
 * @returns NextResponse with status 200 on success, or error response on failure
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse> {
  // Import authenticateRequest dynamically to avoid circular dependency
  const { authenticateRequest } = await import('./auth')

  const authResult = await authenticateRequest(request)

  if (!authResult.success) {
    return NextResponse.json(
      {
        error: authResult.error || 'Authentication failed',
      },
      { status: 401 }
    )
  }

  // Return success response with status 200
  // Headers will be added by calling code
  return NextResponse.json(
    {
      userId: authResult.userId,
      email: authResult.email,
      role: authResult.role,
      roles: authResult.roles,
      permissions: authResult.permissions,
    },
    { status: 200 }
  )
}
