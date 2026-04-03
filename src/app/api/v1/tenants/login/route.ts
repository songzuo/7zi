/**
 * Tenant Login API Route
 * POST /api/v1/tenants/login
 * 
 * 租户登录接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { tenantAuthService } from '@/lib/auth/tenant/service'
import type { TenantLoginRequest } from '@/lib/auth/tenant/types'

export async function POST(request: NextRequest) {
  try {
    const body: TenantLoginRequest = await request.json()

    // 验证请求体
    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Email and password are required',
          },
        },
        { status: 400 }
      )
    }

    // 执行登录
    const result = await tenantAuthService.login(body)

    if (!result.success) {
      return NextResponse.json(result, { status: 401 })
    }

    // 返回成功响应
    return NextResponse.json(result)
  } catch (error) {
    console.error('Tenant login error:', error)
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