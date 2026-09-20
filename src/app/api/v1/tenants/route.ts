/**
 * Tenant API Routes
 * 租户管理 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantService } from '@/lib/tenant/service'
import { auditService } from '@/lib/security/audit'
import { 
  TenantPlan,
  TenantIsolationMode,
  CreateTenantRequest,
} from '@/lib/tenant/types'
import { requirePermission } from '@/lib/tenant/middleware'

/**
 * GET /api/v1/tenants
 * 列出租户（管理员）
 */
export async function GET(request: NextRequest) {
  try {
    // 检查权限
    const permissionCheck = await requirePermission('tenant', 'read')(request)
    if (permissionCheck) return permissionCheck
    
    const userId = request.headers.get('x-user-id') || ''
    const tenants = await tenantService.listUserTenants(userId)
    
    return NextResponse.json({
      success: true,
      data: tenants,
    })
  } catch (error) {
    console.error('Error listing tenants:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/tenants
 * 创建租户
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // 验证请求
    const createRequest: CreateTenantRequest = {
      name: body.name,
      slug: body.slug,
      plan: body.plan as TenantPlan,
      isolationMode: body.isolationMode as TenantIsolationMode,
      settings: body.settings,
    }
    
    if (!createRequest.name) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Tenant name is required' } },
        { status: 400 }
      )
    }
    
    // 创建租户
    const tenant = await tenantService.createTenant(userId, createRequest)
    
    // 记录审计日志
    await auditService.log({
      tenantId: tenant.id,
      userId,
      action: 'tenant_created',
      resourceType: 'tenant',
      resourceId: tenant.id,
      newValue: tenant,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })
    
    return NextResponse.json({
      success: true,
      data: tenant,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * Tenant by ID Routes
 */

/**
 * GET /api/v1/tenants/[id]
 * 获取租户信息
 */
export async function GET_TENANT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await requirePermission('tenant', 'read')(request)
    if (permissionCheck) return permissionCheck
    
    const tenant = await tenantService.getTenant(params.id)
    
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: tenant,
    })
  } catch (error) {
    console.error('Error getting tenant:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/tenants/[id]
 * 更新租户信息
 */
export async function PUT_TENANT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await requirePermission('tenant', 'write')(request)
    if (permissionCheck) return permissionCheck
    
    const userId = request.headers.get('x-user-id') || ''
    const body = await request.json()
    
    // 获取旧值
    const oldTenant = await tenantService.getTenant(params.id)
    
    // 更新租户
    const updated = await tenantService.updateTenant(params.id, body)
    
    // 记录审计日志
    await auditService.logDataChange(
      params.id,
      userId,
      'tenant',
      params.id,
      'update',
      oldTenant,
      updated,
      request.headers.get('x-forwarded-for') || undefined
    )
    
    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/tenants/[id]
 * 删除租户
 */
export async function DELETE_TENANT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await requirePermission('tenant', 'delete')(request)
    if (permissionCheck) return permissionCheck
    
    const userId = request.headers.get('x-user-id') || ''
    
    // 获取旧值
    const oldTenant = await tenantService.getTenant(params.id)
    
    // 删除租户
    await tenantService.deleteTenant(params.id)
    
    // 记录审计日志
    await auditService.logDataChange(
      params.id,
      userId,
      'tenant',
      params.id,
      'delete',
      oldTenant,
      undefined,
      request.headers.get('x-forwarded-for') || undefined
    )
    
    return NextResponse.json({
      success: true,
      data: { id: params.id, deleted: true },
    })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/tenants/[id]/stats
 * 获取租户统计信息
 */
export async function GET_TENANT_STATS(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await requirePermission('tenant', 'read')(request)
    if (permissionCheck) return permissionCheck
    
    const stats = await tenantService.getTenantStats(params.id)
    
    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error getting tenant stats:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/tenants/[id]/quota
 * 获取租户配额
 */
export async function GET_TENANT_QUOTA(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const permissionCheck = await requirePermission('tenant', 'read')(request)
    if (permissionCheck) return permissionCheck
    
    const quota = await tenantService.getTenantQuota(params.id)
    
    return NextResponse.json({
      success: true,
      data: quota,
    })
  } catch (error) {
    console.error('Error getting tenant quota:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}