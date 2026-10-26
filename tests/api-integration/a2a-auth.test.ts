/**
 * A2A 鉴权层单元测试 —— src/lib/agents/a2a/auth.ts
 *
 * 覆盖三种凭据路径：
 *   1. Authorization: Bearer <jwt>  → @/lib/auth/service 的 authenticateToken
 *   2. X-API-Key                    → 环境变量 A2A_API_KEY / A2A_API_KEYS
 *   3. 无凭据                        → 401 + 统一错误信封
 * 以及 canAccessAgent 的权限判定。
 *
 * 注意：本文件只 mock 自身依赖，不触碰其它测试文件的环境变量。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { UserRole, UserStatus } from '@/lib/auth/types'
import { Role } from '@/lib/permissions/types'

vi.mock('@/lib/auth/service', () => ({
  authenticateToken: vi.fn(),
}))

import { authenticateToken } from '@/lib/auth/service'
import {
  authenticateA2ARequest,
  withA2AAuth,
  canAccessAgent,
  type A2AAuthContext,
} from '@/lib/agents/a2a/auth'

/** 构造一个 authenticateToken 的成功返回值 */
function authSuccess(userId: string) {
  return {
    user: {
      id: userId,
      email: `${userId}@example.com`,
      password: 'hashed',
      name: 'Test User',
      role: UserRole.MEMBER,
      roles: [Role.MEMBER],
      status: UserStatus.ACTIVE,
      permissions: [],
      metadata: {},
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    context: {
      userId,
      email: `${userId}@example.com`,
      role: UserRole.MEMBER,
      roles: [Role.MEMBER],
      permissions: [],
      customPermissions: [],
    },
  }
}

/** 构造一个请求 */
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/a2a/registry', {
    method: 'GET',
    headers,
  })
}

const ENV_KEYS = ['A2A_API_KEY', 'A2A_API_KEYS', 'A2A_AGENT_ID'] as const
let savedEnv: Record<string, string | undefined> = {}

describe('A2A 鉴权层 auth.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv = {}
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    vi.clearAllMocks()
  })

  describe('authenticateA2ARequest - Bearer JWT', () => {
    it('有效的 Bearer token 返回 method=jwt 与 userId', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authSuccess('user-123'))

      const auth = await authenticateA2ARequest(
        makeRequest({ Authorization: 'Bearer test-jwt-token-value' })
      )

      expect(auth).toEqual({ method: 'jwt', userId: 'user-123' })
      expect(authenticateToken).toHaveBeenCalledWith('test-jwt-token-value')
    })

    it('authenticateToken 返回 null 时拒绝（返回 null）', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(null)

      const auth = await authenticateA2ARequest(
        makeRequest({ Authorization: 'Bearer test-jwt-token-value' })
      )

      expect(auth).toBeNull()
    })

    it('token 长度不足 10 时直接拒绝，且不调用 authenticateToken', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authSuccess('user-123'))

      const auth = await authenticateA2ARequest(
        makeRequest({ Authorization: 'Bearer short' })
      )

      expect(auth).toBeNull()
      expect(authenticateToken).not.toHaveBeenCalled()
    })

    it('token 长度恰好 10 时通过长度校验并调用 authenticateToken', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authSuccess('user-123'))

      const auth = await authenticateA2ARequest(
        makeRequest({ Authorization: 'Bearer 0123456789' })
      )

      expect(auth).toEqual({ method: 'jwt', userId: 'user-123' })
      expect(authenticateToken).toHaveBeenCalledWith('0123456789')
    })

    it('非 Bearer 的 Authorization 头不按 JWT 处理', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authSuccess('user-123'))

      const auth = await authenticateA2ARequest(
        makeRequest({ Authorization: 'Basic dXNlcjpwYXNz' })
      )

      expect(auth).toBeNull()
      expect(authenticateToken).not.toHaveBeenCalled()
    })
  })

  describe('authenticateA2ARequest - X-API-Key', () => {
    it('A2A_API_KEY 单值匹配时通过', async () => {
      process.env.A2A_API_KEY = 'test-api-key'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'test-api-key' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: undefined })
    })

    it('A2A_API_KEY 匹配时带上 A2A_AGENT_ID', async () => {
      process.env.A2A_API_KEY = 'test-api-key'
      process.env.A2A_AGENT_ID = 'agent-007'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'test-api-key' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: 'agent-007' })
    })

    it('错误的 API Key 被拒绝', async () => {
      process.env.A2A_API_KEY = 'test-api-key'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'wrong-api-key' })
      )

      expect(auth).toBeNull()
    })

    it('未配置任何环境变量时不接受任何 API Key', async () => {
      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'test-api-key' })
      )

      expect(auth).toBeNull()
    })

    it('A2A_API_KEYS 逗号分隔多条目时按 key:agentId 匹配', async () => {
      process.env.A2A_API_KEYS = 'key-one:agent-one,key-two:agent-two'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'key-two' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: 'agent-two' })
    })

    it('A2A_API_KEYS 条目匹配第一条时返回其 agentId', async () => {
      process.env.A2A_API_KEYS = 'key-one:agent-one,key-two:agent-two'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'key-one' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: 'agent-one' })
    })

    it('A2A_API_KEYS 不含冒号的条目也能匹配（agentId 取 A2A_AGENT_ID）', async () => {
      process.env.A2A_API_KEYS = 'plain-key'
      process.env.A2A_AGENT_ID = 'agent-solo'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'plain-key' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: 'agent-solo' })
    })

    it('A2A_API_KEYS 中无匹配项时被拒绝', async () => {
      process.env.A2A_API_KEYS = 'key-one:agent-one,key-two:agent-two'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'key-three' })
      )

      expect(auth).toBeNull()
    })

    it('A2A_API_KEY 与 A2A_API_KEYS 同时配置时任一匹配即可通过', async () => {
      process.env.A2A_API_KEY = 'single-key'
      process.env.A2A_API_KEYS = 'key-one:agent-one'

      const auth = await authenticateA2ARequest(
        makeRequest({ 'X-API-Key': 'key-one' })
      )

      expect(auth).toEqual({ method: 'apiKey', agentId: 'agent-one' })
    })
  })

  describe('authenticateA2ARequest - 无凭据', () => {
    it('没有任何凭据时返回 null', async () => {
      const auth = await authenticateA2ARequest(makeRequest())

      expect(auth).toBeNull()
      expect(authenticateToken).not.toHaveBeenCalled()
    })
  })

  describe('withA2AAuth', () => {
    it('鉴权通过时调用 handler 并返回其响应', async () => {
      vi.mocked(authenticateToken).mockResolvedValue(authSuccess('user-abc'))

      const handler = vi.fn(async () => new Response('ok', { status: 200 }))
      const request = makeRequest({ Authorization: 'Bearer test-jwt-token-value' })

      const response = await withA2AAuth(request, handler)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('ok')
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(request, {
        method: 'jwt',
        userId: 'user-abc',
      })
    })

    it('鉴权失败时返回 401 且不调用 handler', async () => {
      const handler = vi.fn(async () => new Response('ok', { status: 200 }))

      const response = await withA2AAuth(makeRequest(), handler)

      expect(response.status).toBe(401)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(handler).not.toHaveBeenCalled()
    })

    it('401 响应体为统一的错误信封', async () => {
      const response = await withA2AAuth(makeRequest(), vi.fn())

      expect(response.status).toBe(401)

      const body = (await response.json()) as {
        success: boolean
        error: {
          type: string
          message: string
          timestamp: string
        }
      }

      expect(body.success).toBe(false)
      expect(body.error.type).toBe('UNAUTHORIZED')
      expect(body.error.message).toMatch(/Missing or invalid credentials/i)
      expect(body.error.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
      expect(Number.isNaN(Date.parse(body.error.timestamp))).toBe(false)
    })

    it('API Key 鉴权通过时把 apiKey 上下文传给 handler', async () => {
      process.env.A2A_API_KEYS = 'key-one:agent-one'
      const handler = vi.fn(async () => new Response('ok', { status: 200 }))

      const response = await withA2AAuth(
        makeRequest({ 'X-API-Key': 'key-one' }),
        handler
      )

      expect(response.status).toBe(200)
      expect(handler).toHaveBeenCalledWith(expect.anything(), {
        method: 'apiKey',
        agentId: 'agent-one',
      })
    })
  })

  describe('canAccessAgent', () => {
    it('jwt 方式对任意 agent 都返回 true', () => {
      const auth: A2AAuthContext = { method: 'jwt', userId: 'user-1' }

      expect(canAccessAgent(auth, 'agent-1')).toBe(true)
      expect(canAccessAgent(auth, 'agent-2')).toBe(true)
    })

    it('apiKey 方式 agentId 为空时返回 true', () => {
      const auth: A2AAuthContext = { method: 'apiKey' }

      expect(canAccessAgent(auth, 'agent-1')).toBe(true)
    })

    it('apiKey 方式 agentId 与目标一致时返回 true', () => {
      const auth: A2AAuthContext = { method: 'apiKey', agentId: 'agent-1' }

      expect(canAccessAgent(auth, 'agent-1')).toBe(true)
    })

    it('apiKey 方式 agentId 与目标不一致时返回 false', () => {
      const auth: A2AAuthContext = { method: 'apiKey', agentId: 'agent-1' }

      expect(canAccessAgent(auth, 'agent-2')).toBe(false)
    })
  })
})
