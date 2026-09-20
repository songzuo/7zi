/**
 * Switch Tenant API Route
 * POST /api/v1/tenants/switch
 * 
 * 切换租户接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantAuthService, tenantAuthMiddleware } from '@/lib/auth/tenant'

export async function POST(request: NextRequest) {
  try {
    // 验证认证
    const authResult = await tenantAuthMiddleware(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { context } = authResult
    const body = await request.json()

    // 验证请求体
    if (!body.targetTenantId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'targetTenantId is required',
          },
        },
        { status: 400 }
      )
    }

    // 执行切换
    const result = await tenantAuthService.switchTenant(
      context.userId,
      body.targetTenantId
    )

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    // 设置新的 token cookie
    const response = NextResponse.json(result)
    response.cookies.set('token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Tenant switch error:', error)
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