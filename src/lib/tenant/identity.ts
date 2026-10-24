/**
 * 租户身份解析
 *
 * 背景
 * ----
 * 仓库里有多处路由直接用 `request.headers.get('x-user-id')` 取用户身份，
 * 而 `x-user-id` 是**客户端可控**的请求头。`src/proxy.ts` 只做限流与安全
 * 响应头，既不认证也不清洗这些头，因此任何客户端都可以伪造用户身份。
 *
 * 本模块把「如何可信地拿到当前用户 / 租户」收敛到一处：
 * 1. 首选验证 Bearer token（走 `verifyTenantToken`，签名与过期都会被校验）
 * 2. 其次使用**仅在受信环境**下可信的代理头 —— 要求显式开启
 *    `TRUST_PROXY_IDENTITY_HEADERS=true` 才生效，默认关闭
 * 3. 都不行则返回 null，由调用方返回 401
 *
 * 之所以不直接删掉请求头读取：仓库里大量既有代码依赖它，且部分部署形态
 * 确实由上游网关注入身份头。收紧为「默认不信任、需显式开启」既堵住了
 * 默认敞口，也不破坏受信部署。
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * 是否信任代理注入的身份头
 *
 * 默认关闭。开启前请确认上游网关会**剥离**客户端自带的同名头，
 * 否则客户端仍可伪造身份。
 */
function trustProxyIdentityHeaders(): boolean {
  return process.env.TRUST_PROXY_IDENTITY_HEADERS === 'true'
}

/**
 * 从 Authorization 头提取 Bearer token
 */
function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

/**
 * 解析出的请求身份
 */
export interface ResolvedIdentity {
  userId: string
  tenantId?: string
  /** 身份来源，便于审计与排障 */
  source: 'token' | 'proxy-header'
}

/**
 * 解析当前请求的用户身份
 *
 * @param request 入站请求
 * @param requiredTenantId 需要校验归属的租户（可选）。提供时会额外确认
 *                         token 里的 tenantId 与之相符，防止跨租户使用。
 * @returns 解析成功返回身份信息，否则返回 null
 */
export async function resolveIdentity(
  request: NextRequest,
  requiredTenantId?: string
): Promise<ResolvedIdentity | null> {
  // 1) Bearer token —— 唯一经过签名验证的来源
  // 动态 import：避免与 tenant/middleware 形成加载期循环
  const token = extractBearerToken(request)
  if (token) {
    const { verifyTenantToken } = await import('@/lib/auth/tenant/middleware')
    const context = await verifyTenantToken(token)
    if (context) {
      if (requiredTenantId && context.tenantId !== requiredTenantId) {
        return null
      }
      return { userId: context.userId, tenantId: context.tenantId, source: 'token' }
    }
    // token 无效 —— 不再回退到请求头，避免「带个坏 token 就能用头绕过」
    return null
  }

  // 2) 代理注入的身份头（需显式开启）
  if (trustProxyIdentityHeaders()) {
    const userId = request.headers.get('x-user-id')
    if (userId) {
      const tenantId = request.headers.get('x-tenant-id') ?? undefined
      if (requiredTenantId && tenantId !== requiredTenantId) {
        return null
      }
      return { userId, tenantId, source: 'proxy-header' }
    }
  }

  return null
}

/**
 * 解析身份，失败时直接返回 401 响应
 *
 * @returns 成功返回身份；失败返回可直接返回给客户端的 NextResponse
 */
export async function requireIdentity(
  request: NextRequest,
  requiredTenantId?: string
): Promise<ResolvedIdentity | NextResponse> {
  const identity = await resolveIdentity(request, requiredTenantId)
  if (identity) return identity

  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    { status: 401 }
  )
}
