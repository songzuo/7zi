/**
 * Admin Route Authentication Helper
 * 管理端路由鉴权助手
 *
 * 背景：多个 admin 路由各自实现了一份 `checkAuth()`，其中存在同一类漏洞 ——
 * 只检查 `Authorization: Bearer <token>` 头非空，就硬编码 `userId = 'admin'` 放行，
 * 任何字符串都能拿到管理员权限。
 *
 * 本模块提供**唯一**的真实实现：JWT 验签 + admin 角色判定。
 * 各路由统一从这里引入，避免多份实现再次漂移。
 */

import type { NextRequest } from 'next/server'
import { verify } from '@/lib/auth/jwt'

/**
 * Auth result
 */
export interface AdminAuthResult {
  success: boolean
  userId?: string
  error?: string
  /**
   * HTTP status to use when authentication/authorization fails
   * 401 = unauthenticated（缺 token / token 无效 / 过期）
   * 403 = forbidden（已认证但非 admin 角色）
   */
  status?: number
}

/**
 * 检查请求是否具备管理员权限
 *
 * - 缺少或格式错误的 Authorization 头 → 401
 * - JWT 验签失败 / 过期 → 401
 * - 验签通过但角色不是 admin → 403
 * - 通过 → 返回 claims 里的真实 userId（`payload.sub`）
 */
export async function checkAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid authorization header',
      status: 401,
    }
  }

  const token = authHeader.substring('Bearer '.length).trim()

  if (!token) {
    return {
      success: false,
      error: 'Missing or invalid authorization header',
      status: 401,
    }
  }

  // 真实 JWT 校验（签名、issuer、audience、过期时间）
  const result = await verify(token)

  if (!result.valid || !result.payload) {
    return {
      success: false,
      error: result.error || 'Invalid token',
      status: 401,
    }
  }

  const { payload } = result

  // 管理员角色判定
  const roles = payload.roles || []
  const isAdmin = payload.role === 'admin' || roles.includes('admin')

  if (!isAdmin) {
    return {
      success: false,
      error: 'Admin privileges required',
      status: 403,
    }
  }

  return {
    success: true,
    userId: payload.sub,
  }
}
