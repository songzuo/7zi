/**
 * CORS Middleware Unit Tests
 *
 * 覆盖：
 * - OPTIONS 预检请求（允许 / 拒绝来源）
 * - 允许来源判定（数组 / 字符串 / 函数 / '*' / 无 Origin 头）
 * - 拒绝来源（普通请求与预检均返回 403 且不执行 handler）
 * - 响应 CORS 头（Allow-Origin / Methods / Headers / Credentials / Max-Age / Vary）
 * - createCorsMiddleware / corsPolicies / createCorsErrorResponse / getEnvironmentOrigins
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  withCors,
  createCorsMiddleware,
  createCorsErrorResponse,
  getEnvironmentOrigins,
  corsPolicies,
} from '../cors'

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function makeRequest(
  url: string,
  init?: {
    method?: string
    origin?: string
    headers?: Record<string, string>
  }
): NextRequest {
  const headers: Record<string, string> = { ...(init?.headers ?? {}) }
  if (init?.origin) {
    headers.origin = init.origin
  }
  return new NextRequest(url, {
    method: init?.method ?? 'GET',
    headers,
  })
}

describe('CORS middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OPTIONS preflight', () => {
    it('返回 204 且不执行 handler，并带齐 CORS 头', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: ['http://localhost:3000'] })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', {
          method: 'OPTIONS',
          origin: 'http://localhost:3000',
          headers: { 'access-control-request-method': 'POST' },
        })
      )

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
      expect(response.headers.get('Vary')).toBe('Origin')
    })

    it('预检请求来源被拒绝时返回 403 且不执行 handler', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: ['http://localhost:3000'] })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', {
          method: 'OPTIONS',
          origin: 'http://malicious.com',
          headers: { 'access-control-request-method': 'POST' },
        })
      )

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('预检请求使用自定义 onError 时返回自定义状态码', async () => {
      const handler = vi.fn()
      const wrapped = withCors(handler, {
        origin: ['http://localhost:3000'],
        onError: () => NextResponse.json({ success: false }, { status: 418 }),
      })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', {
          method: 'OPTIONS',
          origin: 'http://malicious.com',
        })
      )

      expect(response.status).toBe(418)
    })
  })

  describe('允许来源判定', () => {
    it('数组配置：命中白名单时放行并回显该 Origin', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: ['http://localhost:3000', 'http://localhost:3001'] })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3001' })
      )

      expect(handler).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001')
    })

    it('字符串配置：完全匹配才放行', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: 'http://localhost:3000' })

      const ok = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3000' })
      )
      expect(ok.status).toBe(200)
      expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')

      const blocked = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://other.com' })
      )
      expect(blocked.status).toBe(403)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('函数配置：谓词为 true 时放行，为 false 时拒绝', async () => {
      const allow = vi.fn().mockImplementation((origin: string) => origin.endsWith('.trusted.dev'))
      const wrappedOk = withCors(vi.fn().mockResolvedValue(NextResponse.json({ ok: true })), {
        origin: allow,
      })
      const ok = await wrappedOk(
        makeRequest('http://localhost:3000/api/test', { origin: 'https://a.trusted.dev' })
      )
      expect(ok.status).toBe(200)
      expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://a.trusted.dev')

      const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
      const wrappedBlocked = withCors(handler, { origin: allow })
      const blocked = await wrappedBlocked(
        makeRequest('http://localhost:3000/api/test', { origin: 'https://evil.dev' })
      )
      expect(blocked.status).toBe(403)
      expect(handler).not.toHaveBeenCalled()
    })

    it("'*' 配置：允许任意来源并返回 '*'（不含凭证）", async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: '*', credentials: false })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://any.example.com' })
      )

      expect(handler).toHaveBeenCalledTimes(1)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('false')
    })

    it('无 Origin 头（同源 / curl）视为允许', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: ['http://localhost:3000'] })

      const response = await wrapped(makeRequest('http://localhost:3000/api/test'))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
    })

    it('默认配置允许 http://localhost:3000', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler)

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3000' })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    })
  })

  describe('拒绝来源', () => {
    it('普通请求来源不在白名单时返回 403 且不执行 handler', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
      const wrapped = withCors(handler, { origin: ['http://localhost:3000'] })

      const response = await wrapped(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://evil.com' })
      )

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('handler 抛错时走 onError 并返回 403', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('boom'))
      const wrapped = withCors(handler, { origin: '*' })

      const response = await wrapped(makeRequest('http://localhost:3000/api/test'))

      expect(response.status).toBe(403)
    })
  })

  describe('辅助导出', () => {
    it('createCorsMiddleware 返回可调用的处理器', async () => {
      const middleware = createCorsMiddleware({ origin: ['http://localhost:3000'] })
      const response = await middleware(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3000' })
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    })

    it('corsPolicies.development 允许任意来源', async () => {
      const response = await corsPolicies.development(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://any.example.com' })
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('false')
    })

    it('corsPolicies.strict 只放行白名单来源', async () => {
      const ok = await corsPolicies.strict(['http://localhost:3000'])(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3000' })
      )
      expect(ok.status).toBe(200)

      const blocked = await corsPolicies.strict(['http://localhost:3000'])(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://evil.com' })
      )
      expect(blocked.status).toBe(403)
    })

    it('corsPolicies.apiGateway 暴露限流响应头', async () => {
      const response = await corsPolicies.apiGateway(['http://localhost:3000'])(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://localhost:3000' })
      )
      expect(response.headers.get('Access-Control-Expose-Headers')).toContain('X-RateLimit-Limit')
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('corsPolicies.public 允许任意来源且不暴露限流头以外的配置', async () => {
      const response = await corsPolicies.public(
        makeRequest('http://localhost:3000/api/test', { origin: 'http://any.example.com' })
      )
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('false')
    })

    it('createCorsErrorResponse 返回 403 与 CORS_ERROR 信封', async () => {
      const response = createCorsErrorResponse()
      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('CORS_ERROR')
    })

    it('getEnvironmentOrigins 在 test 环境返回本地来源', () => {
      vi.stubEnv('NODE_ENV', 'test')
      const origins = getEnvironmentOrigins()
      vi.unstubAllEnvs()
      expect(origins).toContain('http://localhost:3000')
      expect(origins.length).toBeGreaterThan(0)
    })
  })
})
