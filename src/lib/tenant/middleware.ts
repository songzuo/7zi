/**
 * Multi-Tenant Middleware
 * 多租户中间件
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantService } from '../tenant/service'
import { TenantMemberStatus, TenantQuota } from '../tenant/types'
import { logger } from '../logger'

/**
 * 租户上下文
 */
export interface TenantRequest extends NextRequest {
  tenantContext?: {
    tenantId: string
    tenantSlug: string
    userId: string
    userRole: string
  }
}

/**
 * 从请求中提取租户ID
 */
function extractTenantId(request: NextRequest): string | null {
  // 1. 从请求头获取
  const headerTenantId = request.headers.get('x-tenant-id')
  if (headerTenantId) return headerTenantId
  
  // 2. 从 URL 路径获取
  const pathParts = request.nextUrl.pathname.split('/')
  if (pathParts.length > 2 && pathParts[1] === 'v1') {
    const potentialTenantId = pathParts[2]
    if (potentialTenantId && !['api', 'auth', 'health'].includes(potentialTenantId)) {
      return potentialTenantId
    }
  }
  
  // 3. 从子域名获取
  const host = request.headers.get('host') || ''
  const subdomain = host.split('.')[0]
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    return subdomain
  }
  
  return null
}

/**
 * 租户识别中间件
 */
export async function tenantMiddleware(
  request: NextRequest
): Promise<NextResponse | void> {
  const tenantId = extractTenantId(request)
  
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant ID is required' } },
      { status: 400 }
    )
  }
  
  try {
    const tenant = await tenantService.getTenant(tenantId)
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      )
    }
    
    if (tenant.status !== 'active') {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_INACTIVE', message: 'Tenant is not active' } },
        { status: 403 }
      )
    }
    
    // 将租户信息添加到请求中
    ;(request as TenantRequest).tenantContext = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: '', // 将在认证中间件中填充
      userRole: '',
    }
    
    // 添加到响应头
    const response = NextResponse.next()
    response.headers.set('x-tenant-id', tenant.id)
    
    return response
  } catch (error) {
    logger.error('Tenant middleware error', { tenantId, error })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * 权限检查中间件工厂
 */
export function requirePermission(resource: string, action: string) {
  return async function permissionMiddleware(
    request: NextRequest
  ): Promise<NextResponse | void> {
    const tenantRequest = request as TenantRequest
    
    if (!tenantRequest.tenantContext) {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } },
        { status: 400 }
      )
    }
    
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    try {
      const context = await tenantService.getTenantContext(userId, tenantRequest.tenantContext.tenantId)
      
      if (!context) {
        return NextResponse.json(
          { success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied to this tenant' } },
          { status: 403 }
        )
      }
      
      // 检查权限
      const hasPermission = context.permissions.some(
        p => p === `perm_${resource}_${action}` || p === `perm_${resource}_write`
      )
      
      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId,
          tenantId: tenantRequest.tenantContext.tenantId,
          resource,
          action,
        })
        
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Permission denied' } },
          { status: 403 }
        )
      }
      
      // 更新租户上下文
      tenantRequest.tenantContext.userId = userId
      tenantRequest.tenantContext.userRole = context.userRole
      
      return NextResponse.next()
    } catch (error) {
      logger.error('Permission middleware error', { userId, resource, action, error })
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      )
    }
  }
}

/**
 * 角色检查中间件工厂
 */
export function requireRole(...allowedRoles: string[]) {
  return async function roleMiddleware(
    request: NextRequest
  ): Promise<NextResponse | void> {
    const tenantRequest = request as TenantRequest
    
    if (!tenantRequest.tenantContext) {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } },
        { status: 400 }
      )
    }
    
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    try {
      const member = await tenantService.getTenantContext(userId, tenantRequest.tenantContext.tenantId)
      
      if (!member) {
        return NextResponse.json(
          { success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied to this tenant' } },
          { status: 403 }
        )
      }
      
      if (!allowedRoles.includes(member.userRole)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient role' } },
          { status: 403 }
        )
      }
      
      tenantRequest.tenantContext.userId = userId
      tenantRequest.tenantContext.userRole = member.userRole
      
      return NextResponse.next()
    } catch (error) {
      logger.error('Role middleware error', { userId, allowedRoles, error })
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      )
    }
  }
}

/**
 * 配额检查中间件工厂
 */
export function checkQuota(resource: 'users' | 'agents' | 'workflows' | 'storage') {
  return async function quotaMiddleware(
    request: NextRequest
  ): Promise<NextResponse | void> {
    const tenantRequest = request as TenantRequest
    
    if (!tenantRequest.tenantContext) {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required' } },
        { status: 400 }
      )
    }
    
    try {
      const quota = await tenantService.getTenantQuota(tenantRequest.tenantContext.tenantId)
      
      // Map 'storage' to 'storageGB' for the quota property
      const quotaProperty = resource === 'storage' ? 'storageGB' : resource
      const current = quota.current[quotaProperty as keyof typeof quota.current]
      const maxKey = `max${quotaProperty.charAt(0).toUpperCase() + quotaProperty.slice(1)}` as keyof TenantQuota
      const max = quota[maxKey]
      
      if (typeof max === 'number' && current >= max) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'QUOTA_EXCEEDED',
              message: `${resource} quota exceeded`,
              details: { current, max },
            },
          },
          { status: 403 }
        )
      }
      
      return NextResponse.next()
    } catch (error) {
      logger.error('Quota middleware error', { resource, error })
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        { status: 500 }
      )
    }
  }
}

/**
 * 审计日志中间件
 */
export async function auditMiddleware(
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  const tenantRequest = request as TenantRequest
  
  if (!tenantRequest.tenantContext) return
  
  const method = request.method
  const path = request.nextUrl.pathname
  
  // 只记录修改操作
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const { auditService } = await import('../security/audit')
    
    await auditService.log({
      tenantId: tenantRequest.tenantContext.tenantId,
      userId: tenantRequest.tenantContext.userId,
      action: `api_${method.toLowerCase()}`,
      resourceType: 'api',
      resourceId: path,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        method,
        path,
        status: response.status,
      },
    })
  }
}