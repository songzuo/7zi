/**
 * TenantAwareAuth - 租户感知认证中间件
 * 
 * 提供认证和租户隔离的核心功能：
 * - JWT Token 生成和验证（包含租户信息）
 * - 租户感知的认证中间件
 * - 权限检查
 */

import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../logger'
import { tenantService } from '../../tenant/service'
import { TenantContextManager } from './context'
import type {
  TenantUserContext,
  TenantJwtPayload,
  TenantLoginRequest,
  TenantLoginResponse,
  TenantLoginSuccessResponse,
  TenantSwitchResponseType,
  PermissionCheckConfig,
} from './types'
import { TenantStatus, type TenantMemberRole } from '../../tenant/types'

/**
 * JWT 配置
 */
const JWT_ISSUER = '7zi-api'
const JWT_AUDIENCE = '7zi-users'

/**
 * 获取 JWT 密钥
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

/**
 * 生成租户感知的 JWT Token
 */
export async function generateTenantToken(
  context: TenantUserContext,
  expiresIn: number = 3600
): Promise<string> {
  const secretKey = getJwtSecret()
  
  const payload: TenantJwtPayload = {
    userId: context.userId,
    email: context.email,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    tenantPlan: context.tenantPlan,
    tenantRole: context.tenantRole,
    roles: context.roles,
    permissions: context.permissions,
    customPermissions: context.customPermissions,
    role: context.tenantRole,
    tenantStatus: TenantStatus.ACTIVE,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .sign(secretKey)

  return token
}

/**
 * 验证租户感知的 JWT Token
 */
export async function verifyTenantToken(token: string): Promise<TenantUserContext | null> {
  try {
    const secretKey = getJwtSecret()
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    // 验证必要字段
    if (!payload.userId || !payload.tenantId) {
      return null
    }

    return TenantContextManager.fromJwtPayload(payload as TenantJwtPayload)
  } catch (error) {
    if (error instanceof Error) {
      logger.debug('Token verification failed', { 
        error: error.message,
        category: 'tenant-auth' 
      })
    }
    return null
  }
}

/**
 * 从请求中提取租户信息
 */
function extractTenantInfo(request: NextRequest): {
  tenantId?: string
  tenantSlug?: string
} {
  // 1. 从 Header 获取
  const headerTenantId = request.headers.get('x-tenant-id')
  const headerTenantSlug = request.headers.get('x-tenant-slug')
  
  if (headerTenantId || headerTenantSlug) {
    return {
      tenantId: headerTenantId || undefined,
      tenantSlug: headerTenantSlug || undefined,
    }
  }

  // 2. 从 URL 路径获取
  const pathParts = request.nextUrl.pathname.split('/')
  // 支持 /api/v1/tenant/{tenantId}/... 格式
  if (pathParts.length > 4 && pathParts[3] === 'tenant') {
    return { tenantId: pathParts[4] }
  }

  // 3. 从子域名获取
  const host = request.headers.get('host') || ''
  const subdomain = host.split('.')[0]
  if (subdomain && !['www', 'api', 'app'].includes(subdomain)) {
    return { tenantSlug: subdomain }
  }

  return {}
}

/**
 * 从请求中提取 Token
 */
function extractToken(request: NextRequest): string | null {
  // 1. 从 Authorization header 获取
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 2. 从 Cookie 获取
  const cookieToken = request.cookies.get('token')?.value
  if (cookieToken) {
    return cookieToken
  }

  // 3. 从 Query 参数获取
  const queryToken = request.nextUrl.searchParams.get('token')
  if (queryToken) {
    return queryToken
  }

  return null
}

/**
 * 租户感知认证中间件
 */
export async function tenantAuthMiddleware(
  request: NextRequest
): Promise<NextResponse | { context: TenantUserContext }> {
  // 提取 Token
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'AUTHENTICATION_REQUIRED', 
          message: 'Authentication token is required' 
        } 
      },
      { status: 401 }
    )
  }

  // 验证 Token
  const context = await verifyTenantToken(token)
  if (!context) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INVALID_TOKEN', 
          message: 'Invalid or expired token' 
        } 
      },
      { status: 401 }
    )
  }

  // 验证租户状态
  const tenant = await tenantService.getTenant(context.tenantId)
  if (!tenant) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'TENANT_NOT_FOUND', 
          message: 'Tenant not found' 
        } 
      },
      { status: 404 }
    )
  }

  if (tenant.status !== 'active') {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'TENANT_INACTIVE', 
          message: 'Tenant is not active' 
        } 
      },
      { status: 403 }
    )
  }

  // 验证用户在租户中的成员身份
  const tenantContext = await tenantService.getTenantContext(
    context.userId, 
    context.tenantId
  )
  
  if (!tenantContext) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'ACCESS_DENIED', 
          message: 'Access denied to this tenant' 
        } 
      },
      { status: 403 }
    )
  }

  // 更新权限（从数据库获取最新权限）
  context.permissions = tenantContext.permissions

  return { context }
}

/**
 * 权限检查中间件工厂
 */
export function requireTenantPermission(
  resource: string, 
  action: 'read' | 'write' | 'delete' | 'execute' | '*'
) {
  return async function permissionMiddleware(
    request: NextRequest
  ): Promise<NextResponse | void> {
    const authResult = await tenantAuthMiddleware(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { context } = authResult
    const permission = `perm_${resource}_${action}`
    
    // 检查权限
    if (!context.permissions.includes(permission) && 
        !context.permissions.includes(`perm_${resource}_write`) &&
        !context.permissions.includes(`perm_*_*`)) {
      
      logger.warn('Permission denied', {
        userId: context.userId,
        tenantId: context.tenantId,
        resource,
        action,
        required: permission,
        permissions: context.permissions,
      })

      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'PERMISSION_DENIED', 
            message: `Permission denied: ${resource}:${action}` 
          } 
        },
        { status: 403 }
      )
    }
  }
}

/**
 * 角色检查中间件工厂
 */
export function requireTenantRole(...allowedRoles: TenantMemberRole[]) {
  return async function roleMiddleware(
    request: NextRequest
  ): Promise<NextResponse | void> {
    const authResult = await tenantAuthMiddleware(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { context } = authResult

    if (!allowedRoles.includes(context.tenantRole)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'ROLE_DENIED', 
            message: 'Insufficient role',
            required: allowedRoles,
            current: context.tenantRole,
          } 
        },
        { status: 403 }
      )
    }
  }
}

/**
 * 管理员权限中间件
 */
export async function requireAdminMiddleware(
  request: NextRequest
): Promise<NextResponse | void> {
  const authResult = await tenantAuthMiddleware(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { context } = authResult

  if (!context.isAdmin) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'ADMIN_REQUIRED', 
          message: 'Admin privileges required' 
        } 
      },
      { status: 403 }
    )
  }
}

/**
 * 所有者权限中间件
 */
export async function requireOwnerMiddleware(
  request: NextRequest
): Promise<NextResponse | void> {
  const authResult = await tenantAuthMiddleware(request)
  
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { context } = authResult

  if (!context.isOwner) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'OWNER_REQUIRED', 
          message: 'Owner privileges required' 
        } 
      },
      { status: 403 }
    )
  }
}

/**
 * 检查用户权限（用于 API 路由内部）
 */
export async function checkUserPermission(
  userId: string,
  tenantId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const context = await tenantService.getTenantContext(userId, tenantId)
    if (!context) return false

    const permission = `perm_${resource}_${action}`
    return context.permissions.some(
      p => p === permission || 
           p === `perm_${resource}_write` ||
           p === `perm_*_*`
    )
  } catch (error) {
    logger.error('Permission check failed', { userId, tenantId, resource, action, error })
    return false
  }
}

/**
 * 获取用户所有租户的上下文
 */
export async function getUserTenantContexts(
  userId: string
): Promise<TenantUserContext[]> {
  const tenants = await tenantService.listUserTenants(userId)
  const contexts: TenantUserContext[] = []

  for (const tenant of tenants) {
    const tenantContext = await tenantService.getTenantContext(userId, tenant.id)
    if (tenantContext) {
      contexts.push(
        TenantContextManager.createTenantUserContext(
          tenantContext,
          '', // email 需要单独获取
          tenantContext.permissions
        )
      )
    }
  }

  return contexts
}

/**
 * 默认导出
 */
export default {
  generateTenantToken,
  verifyTenantToken,
  tenantAuthMiddleware,
  requireTenantPermission,
  requireTenantRole,
  requireAdminMiddleware,
  requireOwnerMiddleware,
  checkUserPermission,
  getUserTenantContexts,
}
