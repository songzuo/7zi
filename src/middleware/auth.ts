/**
 * Authentication Middleware Compatibility Layer
 *
 * This module provides backward compatibility for code expecting `@/middleware/auth`.
 * It re-exports the RBAC middleware functions from `@/lib/auth/middleware-rbac`.
 *
 * @deprecated Import directly from `@/lib/auth/middleware-rbac` instead
 */

// Import necessary types and services
import { NextRequest, NextResponse } from 'next/server';
import { type UserRole } from '@/lib/auth/types';
import { Role } from '@/lib/permissions/types';
import { authenticateToken } from '@/lib/auth/service';
import type { RBACUserContext } from '@/lib/auth/middleware-rbac';

/**
 * Rate limit configuration
 * Used for API rate limiting
 */
export const RATE_LIMIT_CONFIG = {
  // Default limits per minute
  requestsPerMinute: 60,
  // Strict limits for auth endpoints
  authRequestsPerMinute: 5,
  // Login attempts per hour
  loginAttemptsPerHour: 10,
  // Window duration in milliseconds
  windowMs: 60 * 1000, // 1 minute
} as const;

/**
 * Alias for withUserAuth - backward compatibility
 * Simple authentication wrapper that wraps the handler
 *
 * This compatibility layer adds user information as HTTP headers to maintain
 * compatibility with existing code that expects X-User-Id, X-User-Email, etc.
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context?: RBACUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  // Import here to avoid circular dependency
  const { withUserAuth: rbacWithUserAuth } = await import('@/lib/auth/middleware-rbac');

  return rbacWithUserAuth(request, async (req, context) => {
    // Create a new request with user info in headers for backward compatibility
    const headers = new Headers(req.headers);

    if (context) {
      // Add user context as headers
      if (context.userId) {
        headers.set('X-User-Id', context.userId);
      }
      if (context.email) {
        headers.set('X-User-Email', context.email);
      }
      if (context.role) {
        headers.set('X-User-Role', context.role);
      }
      if (context.requestId) {
        headers.set('X-Request-Id', context.requestId);
      }
    }

    // Create new request with modified headers
    const modifiedRequest = new NextRequest(req.url, {
      method: req.method,
      headers,
      body: req.body,
      duplex: req.body ? 'half' : undefined,
    });

    // Call handler with modified request
    return handler(modifiedRequest, context);
  });
}

/**
 * Authenticate request and return authentication result
 * Returns structured auth information without requiring a handler function
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  role?: UserRole;
  roles?: Role[];
  permissions?: string[];
  customPermissions?: string[];
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing authorization header',
    };
  }

  const token = authHeader.substring(7);

  if (!token || token.length < 10) {
    return {
      success: false,
      error: 'Invalid token format',
    };
  }

  const authResult = await authenticateToken(token);

  if (!authResult) {
    return {
      success: false,
      error: 'Invalid or expired token',
    };
  }

  return {
    success: true,
    userId: authResult.context.userId,
    email: authResult.context.email,
    role: authResult.context.role,
    roles: authResult.context.roles || [],
    permissions: authResult.context.permissions || [],
    customPermissions: authResult.context.customPermissions || [],
  };
}

// Re-export everything from the RBAC middleware at the end to avoid circular dependencies
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
