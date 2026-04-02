/**
 * RBAC Middleware - Permission and role-based middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { Permission, Role, PermissionContext, PermissionCheckResult } from './types'
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasRole,
  hasAnyRole,
  hasAllRoles,
} from './rbac'
import { getUserPermissionContext } from './repository'
import { logger } from '../logger'

/**
 * Helper: Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Helper: Create error response
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
  )
}

/**
 * Helper: Create unauthorized response
 */
function createUnauthorizedResponse(requestId: string): NextResponse {
  return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401, requestId)
}

/**
 * Helper: Create forbidden response
 */
function createForbiddenResponse(requestId: string, reason?: string): NextResponse {
  return createErrorResponse(reason || 'Insufficient permissions', 'FORBIDDEN', 403, requestId)
}

/**
 * Get permission context from request (extract from JWT token)
 */
async function getPermissionContextFromRequest(
  request: NextRequest
): Promise<PermissionContext | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  if (!token || token.length < 10) {
    return null
  }

  try {
    const { authenticateToken } = await import('../auth/service')
    const authResult = await authenticateToken(token)

    if (!authResult) {
      return null
    }

    // Get full permission context from database
    const context = await getUserPermissionContext(authResult.context.userId)
    return context
  } catch (error) {
    return null
  }
}

/**
 * RBAC authentication wrapper - provides permission context
 */
export async function withPermissionContext(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext | null) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId()

  try {
    const context = await getPermissionContextFromRequest(request)

    return handler(request, context)
  } catch (error) {
    logger.error('Permission context error:', { error })
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    )
  }
}

/**
 * Require permission context wrapper (fails if no context)
 */
export async function requirePermissionContext(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withPermissionContext(request, async (req, context) => {
    const requestId = generateRequestId()

    if (!context) {
      return createUnauthorizedResponse(requestId)
    }

    return handler(req, context)
  })
}

/**
 * Require specific permission(s) - ALL must be present
 */
export function withPermissions(...requiredPermissions: Permission[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      const result: PermissionCheckResult = hasAllPermissions(context, requiredPermissions)

      if (!result.allowed) {
        return createForbiddenResponse(requestId, result.reason)
      }

      return handler(req, context)
    })
  }
}

/**
 * Require ANY of the specified permissions
 */
export function withAnyPermission(...permissions: Permission[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasAnyPermission(context, permissions)) {
        return createForbiddenResponse(
          requestId,
          `Missing any of required permissions: ${permissions.join(', ')}`
        )
      }

      return handler(req, context)
    })
  }
}

/**
 * Require specific role
 */
export function withRole(requiredRole: Role) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasRole(context, requiredRole)) {
        return createForbiddenResponse(requestId, `Role ${requiredRole} is required`)
      }

      return handler(req, context)
    })
  }
}

/**
 * Require ANY of the specified roles
 */
export function withAnyRole(...roles: Role[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasAnyRole(context, roles)) {
        return createForbiddenResponse(
          requestId,
          `Missing any of required roles: ${roles.join(', ')}`
        )
      }

      return handler(req, context)
    })
  }
}

/**
 * Require ALL of the specified roles
 */
export function withAllRoles(...roles: Role[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasAllRoles(context, roles)) {
        return createForbiddenResponse(requestId, `Missing all required roles: ${roles.join(', ')}`)
      }

      return handler(req, context)
    })
  }
}

/**
 * Require admin role (convenience function)
 */
export function withAdmin(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(Role.ADMIN)(request, handler)
}

/**
 * Require manager or admin role
 */
export function withManagerOrAdmin(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAnyRole(Role.MANAGER, Role.ADMIN)(request, handler)
}

/**
 * Require member or higher role
 */
export function withMemberOrHigher(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAnyRole(Role.ADMIN, Role.MANAGER, Role.MEMBER)(request, handler)
}

/**
 * Require specific permission OR role (flexible authorization)
 */
export function withPermissionOrRole(permission: Permission, role: Role) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasPermission(context, permission) && !hasRole(context, role)) {
        return createForbiddenResponse(
          requestId,
          `Requires permission ${permission} or role ${role}`
        )
      }

      return handler(req, context)
    })
  }
}

/**
 * Require specific permission AND role (strict authorization)
 */
export function withPermissionAndRole(permission: Permission, role: Role) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: PermissionContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return requirePermissionContext(request, async (req, context) => {
      const requestId = generateRequestId()

      if (!hasPermission(context, permission)) {
        return createForbiddenResponse(requestId, `Missing permission: ${permission}`)
      }

      if (!hasRole(context, role)) {
        return createForbiddenResponse(requestId, `Missing role: ${role}`)
      }

      return handler(req, context)
    })
  }
}

/**
 * Optional authentication with permission context
 * Provides context if present, doesn't fail if absent
 */
export async function withOptionalPermissionContext(
  request: NextRequest,
  handler: (request: NextRequest, context: PermissionContext | null) => Promise<NextResponse>
): Promise<NextResponse> {
  return withPermissionContext(request, handler)
}
