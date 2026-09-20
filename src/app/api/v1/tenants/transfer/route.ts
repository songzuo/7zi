/**
 * Transfer User API Route
 * POST /api/v1/tenants/transfer
 * 
 * 跨租户转移用户接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantAuthService, tenantAuthMiddleware } from '@/lib/auth/tenant'
import type { CrossTenantTransferRequest } from '@/lib/auth/tenant/types'

export async function POST(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await tenantAuthMiddleware(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { context } = authResult
    const body: CrossTenantTransferRequest = await request.json()

    // 验证请求体
    if (!body.userId || !body.sourceTenantId || !body.targetTenantId || !body.targetRole) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'userId, sourceTenantId, targetTenantId, and targetRole are required',
          },
        },
        { status: 400 }
      )
    }

    // 执行转移
    const result = await tenantAuthService.transferUser(context, body)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Tenant transfer error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'