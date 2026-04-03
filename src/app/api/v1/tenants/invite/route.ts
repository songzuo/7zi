/**
 * Invite to Tenant API Route
 * POST /api/v1/tenants/invite
 * 
 * 邀请用户到租户接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantAuthService, tenantAuthMiddleware } from '@/lib/auth/tenant'
import type { CrossTenantInviteRequest } from '@/lib/auth/tenant/types'

export async function POST(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await tenantAuthMiddleware(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { context } = authResult
    const body: CrossTenantInviteRequest = await request.json()

    // 验证请求体
    if (!body.targetTenantId || !body.email || !body.role) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'targetTenantId, email, and role are required',
          },
        },
        { status: 400 }
      )
    }

    // 执行邀请
    const result = await tenantAuthService.inviteToTenant(context, body)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Tenant invite error:', error)
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