/**
 * Projects API Route Tests
 *
 * 测试项目管理 API 端点：
 * - GET /api/projects (列表)
 * - POST /api/projects (创建)
 * - 权限验证
 */

import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

describe('Projects API - GET /api/projects', () => {
  it('应该为管理员返回所有项目', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      headers: {
        'x-user-id': 'user-1', // admin
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeInstanceOf(Array)
  })

  it('应该为普通用户返回可访问的项目', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      headers: {
        'x-user-id': 'user-3', // developer
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('应该拒绝未认证的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      headers: {
        'x-user-id': 'non-existent',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('应该拒绝无权限的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      headers: {
        'x-user-id': 'user-4', // 无权限用户（如果存在）
      },
    })

    const response = await GET(request)
    const data = await response.json()

    // 应该返回 403 Forbidden 或 401 Unauthorized
    expect([401, 403]).toContain(response.status)
  })
})

// Mock CSRF middleware to bypass token validation in tests
vi.mock('@/lib/middleware/csrf', () => ({
  withCSRF: (handler: Function) => handler, // Bypass CSRF validation
  generateCSRFToken: vi.fn(),
  getCSRFToken: vi.fn(),
  requiresCSRFProtection: vi.fn(() => false),
  extractCSRFToken: vi.fn(() => ({})),
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

// Mock api-rate-limit to bypass rate limiting
vi.mock('@/lib/api-rate-limit', () => ({
  withRateLimit: (config: unknown, handler: Function) => handler, // Bypass rate limiting
  RATE_LIMIT_PRESETS: {
    strict: { windowMs: 60000, maxRequests: 5 },
  },
}))

describe('Projects API - POST /api/projects', () => {
  it('应该为有权限的用户创建项目', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-2', // team_leader
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'New Project',
        description: 'A new test project',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('New Project')
    expect(data.data.description).toBe('A new test project')
    expect(data.data.ownerId).toBe('user-2')
  })

  it('应该拒绝缺少名称的项目创建', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'A project without name',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该拒绝无权限的用户创建项目', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-3', // developer - 可能没有创建权限
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Unauthorized Project',
        description: 'Should not be created',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // 应该返回 403 Forbidden
    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('应该拒绝未认证的请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'x-user-id': 'non-existent',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('应该处理无效的 JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-2',
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
