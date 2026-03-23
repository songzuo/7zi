/**
 * User Authentication Middleware - RBAC Enhanced
 * Verifies JWT tokens and provides user context with multi-role support
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateToken } from './service';
import { UserContext } from './types';
import { Permission, Role } from '@/lib/permissions/types';
import { hasAllPermissions, hasAnyPermission, hasRole, hasAnyRole } from '@/lib/permissions/rbac';
import { getUserPermissionContext } from '@/lib/permissions/repository';
import { logger } from '../logger';

/**
 * Enhanced UserContext with RBAC support
 */
export interface RBACUserContext extends UserContext {
  permissionContext?: {
    userId: string;
    roles: Role[];
    permissions: Permission[];
    customPermissions?: Permission[];
  };
}

/**
 * User authentication middleware with RBAC support
 */
export async function withUserAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Missing authorization header', 'UNAUTHORIZED', 401, requestId);
    }

    const token = authHeader.substring(7);

    // Validate token format
    if (!token || token.length < 10) {
      return createErrorResponse('Invalid token format', 'INVALID_TOKEN', 401, requestId);
    }

    // Verify token
    const authResult = await authenticateToken(token);
    if (!authResult) {
      return createErrorResponse('Invalid or expired token', 'INVALID_TOKEN', 401, requestId);
    }

    // Get RBAC permission context
    const permissionContext = await getUserPermissionContext(authResult.context.userId);

    // Build enhanced context
    const context: RBACUserContext = {
      ...authResult.context,
      requestId,
      permissionContext: permissionContext
        ? {
            userId: authResult.context.userId,
            roles: permissionContext.roles,
            permissions: permissionContext.permissions,
            customPermissions: permissionContext.customPermissions,
          }
        : undefined,
    };

    // Execute handler
    return handler(request, context);
  } catch (error) {
    logger.error('User auth error:', { error });
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    );
  }
}

/**
 * Permission check middleware - requires ALL permissions (RBAC-aware)
 */
export function withPermissions(...requiredPermissions: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withUserAuth(request, async (req, context) => {
      if (!context.permissionContext) {
        return createErrorResponse(
          'Permission context not available',
          'INTERNAL_ERROR',
          500,
          context.requestId || generateRequestId()
        );
      }

      // Convert string permissions to Permission enum
      const permissionEnums = requiredPermissions.filter((p): p is Permission => Object.values(Permission).includes(p as Permission));

      if (!hasAllPermissions(context.permissionContext, permissionEnums)) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId || generateRequestId()
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Any permission middleware - requires at least ONE permission (RBAC-aware)
 */
export function withAnyPermission(...permissions: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withUserAuth(request, async (req, context) => {
      if (!context.permissionContext) {
        return createErrorResponse(
          'Permission context not available',
          'INTERNAL_ERROR',
          500,
          context.requestId || generateRequestId()
        );
      }

      // Convert string permissions to Permission enum
      const permissionEnums = permissions.filter((p): p is Permission => Object.values(Permission).includes(p as Permission));

      if (!hasAnyPermission(context.permissionContext, permissionEnums)) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId || generateRequestId()
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Role check middleware - requires specific role (RBAC-aware)
 */
export function withRole(requiredRole: string) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withUserAuth(request, async (req, context) => {
      if (!context.permissionContext) {
        return createErrorResponse(
          'Permission context not available',
          'INTERNAL_ERROR',
          500,
          context.requestId || generateRequestId()
        );
      }

      // Convert string role to Role enum
      const roleEnum = Object.values(Role).includes(requiredRole as Role) ? (requiredRole as Role) : null;

      if (!roleEnum || !hasRole(context.permissionContext, roleEnum)) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId || generateRequestId()
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Any role middleware - requires at least ONE role (RBAC-aware)
 */
export function withAnyRole(...roles: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withUserAuth(request, async (req, context) => {
      if (!context.permissionContext) {
        return createErrorResponse(
          'Permission context not available',
          'INTERNAL_ERROR',
          500,
          context.requestId || generateRequestId()
        );
      }

      // Convert string roles to Role enum
      const roleEnums = roles.filter((r): r is Role => Object.values(Role).includes(r as Role));

      if (!hasAnyRole(context.permissionContext, roleEnums)) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId || generateRequestId()
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * Admin role middleware (RBAC-aware)
 */
export function withAdmin(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(Role.ADMIN)(request, handler);
}

/**
 * Manager or admin role middleware (RBAC-aware)
 */
export function withManagerOrAdmin(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACUserContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAnyRole(Role.ADMIN, Role.MANAGER)(request, handler);
}

/**
 * Optional authentication - doesn't fail if no token, but provides context if present (RBAC-aware)
 */
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACUserContext | null) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, call handler with null context
      return handler(request, null);
    }

    const token = authHeader.substring(7);

    // Validate token format
    if (!token || token.length < 10) {
      return handler(request, null);
    }

    const authResult = await authenticateToken(token);

    if (!authResult) {
      // Invalid token, call handler with null context
      return handler(request, null);
    }

    // Get RBAC permission context
    const permissionContext = await getUserPermissionContext(authResult.context.userId);

    const context: RBACUserContext = {
      ...authResult.context,
      requestId,
      permissionContext: permissionContext
        ? {
            userId: authResult.context.userId,
            roles: permissionContext.roles,
            permissions: permissionContext.permissions,
            customPermissions: permissionContext.customPermissions,
          }
        : undefined,
    };

    return handler(request, context);
  } catch (error) {
    logger.error('Optional auth error:', { error });
    // On error, call handler with null context
    return handler(request, null);
  }
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error response
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    },
    { status }
  );
}
