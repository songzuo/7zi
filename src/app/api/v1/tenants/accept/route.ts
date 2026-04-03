/**
 * Accept Tenant Invite API Route
 * POST /api/v1/tenants/accept
 * 
 * 接受租户邀请接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantAuthService } from '@/lib/auth/tenant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证请求体
    if (!body.token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'token is required',
          },
        },
        { status: 400 }
      )
    }

    // 从 token 中获取用户 ID（需要先验证用户身份）
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const context = await tenantAuthService.verifyAndGetContext(token)

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // 执行接受邀请
    const result = await tenantAuthService.acceptInvite(context.userId, body.token)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Accept tenant invite error:', error)
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