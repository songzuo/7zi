/**
 * Auth API Route Tests
 *
 * 测试认证相关 API 端点：
 * - POST /api/auth (登录)
 * - PUT /api/auth (注册)
 * - PATCH /api/auth (重置密码)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, PUT, PATCH } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/audit/logger', () => ({
  AuditLogger: {
    logAuthEvent: vi.fn().mockResolvedValue(undefined),
    logRegistration: vi.fn().mockResolvedValue(undefined),
    logPasswordReset: vi.fn().mockResolvedValue(undefined),
    logApiAccess: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock rate-limit/limiter with proper class constructor
vi.mock('@/lib/rate-limit/limiter', () => {
  return {
    getClientIP: vi.fn(() => '127.0.0.1'),
    RateLimiter: vi.fn().mockImplementation(() => ({
      checkLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5, resetTime: Date.now() + 60000 }),
    })),
    formatRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
  }
})

// Mock CSRF middleware to bypass token validation in tests
vi.mock('@/lib/middleware/csrf', () => ({
  withCSRF: (handler: Function) => handler, // Bypass CSRF validation
  generateCSRFToken: vi.fn(),
  getCSRFToken: vi.fn(),
  requiresCSRFProtection: vi.fn(() => false),
  extractCSRFToken: vi.fn(() => ({})),
}))

// Mock api-rate-limit to bypass rate limiting
vi.mock('@/lib/api-rate-limit', () => ({
  withRateLimit: (config: unknown, handler: Function) => handler, // Bypass rate limiting
  RATE_LIMIT_PRESETS: {
    strict: { windowMs: 60000, maxRequests: 5 },
  },
}))

// Import mocked modules after vi.mock
import { AuditLogger } from '@/lib/audit/logger'

describe('Auth API - POST /api/auth (登录)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('应该在认证系统未配置时返回 501 而非放行', async () => {
    // 认证尚未实现（2026-04-24 的安全修复）：路由必须返回 501 拒绝一切登录请求，
    // 以防任何人绕过鉴权。绝不能返回 200。
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.success).toBe(false)
    expect(data.data).toBeUndefined()
  })

  it('应该拒绝无效凭据', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // 认证未配置时，统一返回 501（不区分凭据是否有效，避免账号枚举）
    expect(response.status).toBe(501)
    expect(data.success).toBe(false)
  })

  it('应该拒绝缺少用户名的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该拒绝缺少密码的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该处理无效的 JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
  })
})

describe('Auth API - PUT /api/auth (注册)', () => {
  it('应该在认证系统未配置时拒绝注册', async () => {
    // 注册同样未实现（2026-04-24 安全修复），必须返回 501 而非真的建号
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.success).toBe(false)
  })

  it('应该拒绝无效的邮箱格式', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该拒绝弱密码', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该拒绝缺少必填字段的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PUT',
      body: JSON.stringify({
        username: 'testuser',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('Auth API - PATCH /api/auth (重置密码)', () => {
  it('应该在认证系统未配置时拒绝密码重置', async () => {
    // 密码重置同样未实现（2026-04-24 安全修复），必须返回 501
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        token: 'valid-token',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(501)
    expect(data.success).toBe(false)
  })

  it('应该拒绝缺少 token', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        password: 'NewPassword123!',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该拒绝缺少新密码', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth', {
      method: 'PATCH',
      body: JSON.stringify({
        token: 'valid-token',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
