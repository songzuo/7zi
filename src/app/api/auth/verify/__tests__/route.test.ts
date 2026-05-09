/**
 * Auth Verify API Route Tests
 *
 * 测试 Token 验证 API 路由的完整功能 (OAuth 2.0 Token Introspection)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock dependencies
const mockVerifyJwtToken = vi.fn()
const mockAuthenticateToken = vi.fn()
const mockVerifyAgentToken = vi.fn()
const mockIsTokenBlacklisted = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  auth: vi.fn(),
}

vi.mock('@/lib/auth/service', () => ({
  verifyJwtToken: (...args: unknown[]) => mockVerifyJwtToken(...args),
  authenticateToken: (...args: unknown[]) => mockAuthenticateToken(...args),
}))

vi.mock('@/lib/agents/core/auth-service', () => ({
  verifyAgentToken: (...args: unknown[]) => mockVerifyAgentToken(...args),
}))

vi.mock('@/lib/auth/token-blacklist', () => ({
  isTokenBlacklisted: (...args: unknown[]) => mockIsTokenBlacklisted(...args),
}))

vi.mock('@/lib/auth/audit-logger', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
  AuditEventType: {
    TOKEN_VERIFIED: 'TOKEN_VERIFIED',
    TOKEN_INVALID: 'TOKEN_INVALID',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}))

vi.mock('@/lib/auth/jwt', () => ({
  verify: (...args: unknown[]) => mockVerifyJwtToken(...args),
}))

function createMockRequest(
  url: string = 'http://localhost:3000/api/auth/verify',
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const urlObj = new URL(url)
  const headers = new Headers()
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value)
    })
  }

  const request = new Request(urlObj, {
    method: options.method || 'GET',
    headers,
  })

  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    clear: vi.fn(),
  }

  const nextRequest = request as NextRequest & {
    cookies?: typeof mockCookieStore
    nextUrl?: typeof urlObj
  }

  Object.defineProperty(nextRequest, 'cookies', {
    value: mockCookieStore,
    writable: false,
    configurable: true,
  })
  Object.defineProperty(nextRequest, 'nextUrl', {
    value: urlObj,
    writable: false,
    configurable: true,
  })

  return nextRequest as NextRequest
}

describe('Auth Verify API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsTokenBlacklisted.mockResolvedValue(false)
  })

  describe('GET request - token verification', () => {
    const validUserToken = 'valid-user-jwt-token'
    const validAgentToken = 'valid-agent-token'

    it('should return active=true for valid user token', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: true,
        payload: {
          type: 'user',
          sub: 'user-123',
          email: 'test@example.com',
          role: 'member',
          roles: ['member'],
          permissions: ['read', 'write'],
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      })
      mockAuthenticateToken.mockResolvedValue({ userId: 'user-123' })

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${validUserToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.active).toBe(true)
      expect(data.sub).toBe('user-123')
      expect(data.email).toBe('test@example.com')
      expect(data.role).toBe('member')
      expect(data.type).toBe('user')
    })

    it('should return active=true for valid agent token', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: true,
        payload: {
          type: 'agent',
          sub: 'agent-456',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      })
      mockVerifyAgentToken.mockResolvedValue({
        agentId: 'agent-456',
        role: 'agent',
        permissions: ['read', 'execute'],
      })

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${validAgentToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.active).toBe(true)
      expect(data.sub).toBe('agent-456')
      expect(data.type).toBe('agent')
    })

    it('should return active=false when no token provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
      expect(data.error).toContain('No token provided')
    })

    it('should return active=false when token is blacklisted', async () => {
      mockIsTokenBlacklisted.mockResolvedValue(true)

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${validUserToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
      expect(data.error).toContain('revoked')
    })

    it('should return active=false for invalid token', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token signature',
      })

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
      expect(data.error).toContain('Invalid token')
    })

    it('should return active=false when token validation fails', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: true,
        payload: {
          type: 'user',
          sub: 'user-123',
        },
      })
      mockAuthenticateToken.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${validUserToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
      expect(data.error).toContain('Token validation failed')
    })

    it('should accept token via query parameter as alternative', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: true,
        payload: {
          type: 'user',
          sub: 'user-123',
          email: 'test@example.com',
          role: 'member',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
      })
      mockAuthenticateToken.mockResolvedValue({ userId: 'user-123' })

      const request = createMockRequest(`http://localhost:3000/api/auth/verify?token=${validUserToken}`, {
        method: 'GET',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.active).toBe(true)
    })

    it('should handle expired token', async () => {
      mockVerifyJwtToken.mockResolvedValue({
        valid: false,
        error: 'Token has expired',
      })

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: 'Bearer expired-token',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
    })
  })

  describe('GET request - error handling', () => {
    it('should return 500 for unexpected errors', async () => {
      mockVerifyJwtToken.mockRejectedValue(new Error('Unexpected error'))

      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: 'Bearer some-token',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.active).toBe(false)
      expect(data.error).toContain('verification failed')
    })

    it('should reject malformed authorization header', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: {
          authorization: 'NotBearer token',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      // Should fall back to query param check and fail since no token in query
      expect(response.status).toBe(401)
      expect(data.active).toBe(false)
    })
  })
})

// Alias for compatibility
const POST = GET
