/**
 * Tenant Login API Route Tests
 *
 * 测试租户登录 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockTenantAuthLogin = vi.fn()

vi.mock('@/lib/auth/tenant/service', () => ({
  tenantAuthService: {
    login: vi.fn((...args: unknown[]) => mockTenantAuthLogin(...args)),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

function createMockRequest(
  url: string = 'http://localhost:3000/api/v1/tenants/login',
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: unknown
  } = {}
): NextRequest {
  const urlObj = new URL(url)
  const headers = new Headers()
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value)
    })
  }

  let body: string | undefined
  if (options.body) {
    body = JSON.stringify(options.body)
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
  }

  const request = new Request(urlObj, {
    method: options.method || 'GET',
    headers,
    body,
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

describe('Tenant Login API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST request', () => {
    const validLoginBody = {
      email: 'user@example.com',
      password: 'SecurePass123',
      tenantId: 'tenant-123',
    }

    const mockSuccessResponse = {
      success: true,
      token: 'jwt-token-abc',
      refreshToken: 'refresh-token-xyz',
      user: {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      },
      tenant: {
        id: 'tenant-123',
        name: 'Test Tenant',
        slug: 'test-tenant',
      },
    }

    it('should login successfully with valid credentials', async () => {
      mockTenantAuthLogin.mockResolvedValue(mockSuccessResponse)

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: validLoginBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.token).toBeDefined()
      expect(data.refreshToken).toBeDefined()
      expect(data.user).toBeDefined()
      expect(data.tenant).toBeDefined()
      expect(mockTenantAuthLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'SecurePass123',
        tenantId: 'tenant-123',
      })
    })

    it('should reject login without email', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {
          password: 'SecurePass123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_REQUEST')
      expect(data.error.message).toContain('Email')
    })

    it('should reject login without password', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_REQUEST')
      expect(data.error.message).toContain('password')
    })

    it('should reject login with invalid credentials', async () => {
      mockTenantAuthLogin.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
        errorCode: 'INVALID_CREDENTIALS',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'WrongPassword',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email or password')
    })

    it('should reject login for inactive user', async () => {
      mockTenantAuthLogin.mockResolvedValue({
        success: false,
        error: 'Account is not active',
        errorCode: 'USER_INACTIVE',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {
          email: 'inactive@example.com',
          password: 'SecurePass123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.errorCode).toBe('USER_INACTIVE')
    })

    it('should handle internal server error', async () => {
      mockTenantAuthLogin.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: validLoginBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should reject login with tenant slug instead of tenant id', async () => {
      mockTenantAuthLogin.mockResolvedValue({
        success: false,
        error: 'Tenant not found',
        errorCode: 'TENANT_NOT_FOUND',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'SecurePass123',
          tenantSlug: 'non-existent-tenant',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should handle empty request body', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/login', {
        method: 'POST',
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})
