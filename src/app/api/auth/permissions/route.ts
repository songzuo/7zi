/**
 * Permissions API Route
 * GET /api/auth/permissions - Get current user's permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJwtToken, authenticateToken } from '@/lib/auth/service'
import { verifyAgentToken } from '@/lib/agents/core/auth-service'
import { 
  getEntityPermissions, 
  getPermissionSummary,
  checkPermission,
  PermissionResource,
  PermissionAction 
} from '@/lib/auth/enhanced-permissions'
import { logAuditEvent, AuditEventType } from '@/lib/auth/audit-logger'
import { verify } from '@/lib/auth/jwt'

/**
 * Response types
 */
interface PermissionsResponse {
  userId?: string
  agentId?: string
  role?: string
  roles?: string[]
  permissions: string[]
  resourcePermissions?: {
    resource: string
    actions: string[]
    resourceId?: string
  }[]
  summary: {
    totalPermissions: number
    byResource: Record<string, number>
    byAction: Record<string, number>
    hasWildcard: boolean
    hasAdmin: boolean
  }
}

interface PermissionsErrorResponse {
  error: string
}

/**
 * GET /api/auth/permissions
 * Get the current authenticated entity's permissions
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Query params:
 *   resource: string (optional) - Check specific resource
 *   action: string (optional) - Check specific action
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<PermissionsErrorResponse>(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT
    const result = await verify(token)

    if (!result.valid || !result.payload) {
      return NextResponse.json<PermissionsErrorResponse>(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { payload } = result

    // Check for specific permission query
    const resource = request.nextUrl.searchParams.get('resource') as PermissionResource | null
    const action = request.nextUrl.searchParams.get('action') as PermissionAction | null

    if (resource && action) {
      // Check specific permission
      const checkResult = await checkPermission({
        userId: payload.type === 'user' ? payload.sub : undefined,
        agentId: payload.type === 'agent' ? payload.sub : undefined,
        roles: payload.roles,
        resource,
        action,
      })

      return NextResponse.json({
        allowed: checkResult.allowed,
        reason: checkResult.reason,
        resource,
        action,
      })
    }

    // Get all permissions
    const resourcePerms = await getEntityPermissions({
      userId: payload.type === 'user' ? payload.sub : undefined,
      agentId: payload.type === 'agent' ? payload.sub : undefined,
    })

    // Group permissions by resource
    const resourcePermissions = resourcePerms.reduce<Record<string, Set<string>>>((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = new Set()
      }
      acc[perm.resource].add(perm.action)
      return acc
    }, {})

    const resourcePermsArray = Object.entries(resourcePermissions).map(([resource, actions]) => ({
      resource,
      actions: Array.from(actions),
    }))

    // Get permission summary
    const summary = await getPermissionSummary({
      userId: payload.type === 'user' ? payload.sub : undefined,
      agentId: payload.type === 'agent' ? payload.sub : undefined,
      roles: payload.roles,
    })

    // Log permission access
    await logAuditEvent({
      eventType: AuditEventType.PERMISSION_GRANTED,
      userId: payload.type === 'user' ? payload.sub : undefined,
      agentId: payload.type === 'agent' ? payload.sub : undefined,
      resource: 'permissions',
      action: 'read',
      result: 'success',
    })

    return NextResponse.json<PermissionsResponse>({
      userId: payload.type === 'user' ? payload.sub : undefined,
      agentId: payload.type === 'agent' ? payload.sub : undefined,
      role: payload.role,
      roles: payload.roles,
      permissions: payload.permissions || [],
      resourcePermissions: resourcePermsArray,
      summary,
    })
  } catch (error) {
    console.error('Permissions endpoint error:', error)

    return NextResponse.json<PermissionsErrorResponse>(
      { error: 'Failed to retrieve permissions' },
      { status: 500 }
    )
  }
}
