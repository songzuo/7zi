/**
 * A2A 路由鉴权
 *
 * ## 为什么需要
 *
 * A2A 的 AgentCard 自己声明了 securitySchemes：
 *   - bearerAuth (JWT Bearer)
 *   - apiKey (X-API-Key)
 * 并且明确写了 extended agent card 是「for authenticated users」、
 * 含「Administrative operations for authenticated users」。
 *
 * 但 5 个 A2A 路由里，**只有 jsonrpc 之外的那几个完全没有鉴权**：
 * registry 的 GET/POST/PUT/DELETE/PATCH、registry/[id]/heartbeat 的 POST
 * 都可以匿名调用 —— 任何人都能列出、注册、改名、删除 agent，
 * 甚至拿到标注为「管理操作」的 extended agent card。
 *
 * 仓库里没有根 middleware.ts，也没有全局鉴权层，
 * 所以必须由路由自己守门。仓库既有的做法是 `@/lib/auth/middleware-rbac`
 * 的 withUserAuth —— 本文件复用同一个 authenticateToken，
 * 但额外接受 AgentCard 声明的 X-API-Key 方式（A2A 是 agent-to-agent 协议，
 * 机器对机器调用通常用 API Key 而不是用户 JWT）。
 *
 * ## 两种凭据
 *   - Authorization: Bearer <jwt>   → 与 withUserAuth 一致的用户 JWT
 *   - X-API-Key: <key>              → AgentCard 声明的 apiKey 方式
 *
 * 两种都校验通过才放行；都没有 → 401。
 */

import { NextRequest } from 'next/server'
import { authenticateToken } from '@/lib/auth/service'
import { getAgentRegistry } from '@/lib/agents/a2a/agent-registry'
import { logger } from '@/lib/logger'

export interface A2AAuthContext {
  /** 'jwt' | 'apiKey' —— 便于审计区分凭据来源 */
  method: 'jwt' | 'apiKey'
  userId?: string
  agentId?: string
}

/** A2A 专用的错误响应（不依赖 @/lib/api/error-handler，保持 a2a 模块自洽） */
function unauthorized(message: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code: 'UNAUTHORIZED', message },
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * 校验 agent 的 API Key。
 *
 * 判定依据：AgentCard 里声明的 apiKey securityScheme。
 * API Key 存在哪由部署决定，这里支持两种常见位置：
 *   1. 环境变量 A2A_API_KEYS（逗号分隔，键值形式 key:agentId）
 *   2. 环境变量 A2A_API_KEY（单值，适用于单 agent 场景）
 *
 * 都没有配置 → 不接受任何 API Key（避免"配置缺失等于放行"）。
 */
function verifyApiKey(apiKey: string): { agentId?: string } | null {
  const single = process.env.A2A_API_KEY
  if (single && single.length > 0 && single === apiKey) {
    return { agentId: process.env.A2A_AGENT_ID }
  }

  const multi = process.env.A2A_API_KEYS
  if (multi && multi.length > 0) {
    for (const entry of multi.split(',')) {
      const trimmed = entry.trim()
      if (!trimmed) continue
      const sep = trimmed.indexOf(':')
      if (sep === -1) {
        if (trimmed === apiKey) return { agentId: process.env.A2A_AGENT_ID }
      } else {
        const key = trimmed.slice(0, sep)
        const agentId = trimmed.slice(sep + 1)
        if (key === apiKey) return { agentId }
      }
    }
  }

  return null
}

/**
 * 校验请求凭据。
 * @returns 通过时返回 context；不通过时返回 null（调用方回 401）
 */
export async function authenticateA2ARequest(
  request: NextRequest
): Promise<A2AAuthContext | null> {
  // 1) Bearer JWT（与仓库既有 withUserAuth 走同一个 authenticateToken）
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token.length >= 10) {
      const authResult = await authenticateToken(token)
      if (authResult) {
        return { method: 'jwt', userId: authResult.context.userId }
      }
    }
    logger.warn('[a2a] Bearer token 无效')
    return null
  }

  // 2) X-API-Key（AgentCard 声明的 apiKey 方式）
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('X-API-Key') ||
    request.headers.get('x-api_key')
  if (apiKey) {
    const verified = verifyApiKey(apiKey)
    if (verified) {
      return { method: 'apiKey', agentId: verified.agentId }
    }
    logger.warn('[a2a] X-API-Key 无效')
    return null
  }

  return null
}

/**
 * 包装路由处理函数，加上 A2A 鉴权。
 *
 * 用法：
 *   export async function GET(request: NextRequest) {
 *     return withA2AAuth(request, handleGet)
 *   }
 */
export async function withA2AAuth(
  request: NextRequest,
  handler: (request: NextRequest, auth: A2AAuthContext) => Promise<Response>
): Promise<Response> {
  const auth = await authenticateA2ARequest(request)
  if (!auth) {
    return unauthorized('Missing or invalid credentials')
  }
  return handler(request, auth)
}

/**
 * registry 专用的额外校验：操作某个 agent 时，
 * API Key 方式必须与目标 agent 匹配（防止用一个 key 改别人的 agent）。
 * JWT 方式不做限制（权限由 RBAC 层管）。
 */
export function canAccessAgent(auth: A2AAuthContext, agentId: string): boolean {
  if (auth.method === 'jwt') return true
  return !auth.agentId || auth.agentId === agentId
}

/** 重新导出，方便路由统一 import */
export { getAgentRegistry }
