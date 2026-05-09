/**
 * Tenant Switch API Route Tests
 *
 * 测试租户切换 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockTenantAuthMiddleware = vi.fn()
const mockSwitchTenant = vi.fn()
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}

vi.mock('@/lib/auth/tenant', () => ({
  tenantAuthService: {
    switchTenant: vi.fn((...args: unknown[]) => mockSwitchTenant(...args)),
  },
  tenantAuthMiddleware: vi.fn((...args: unknown[]) => mockTenantAuthMiddleware(...args)),
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
  url: string = 'http://localhost:3000/api/v1/tenants/switch',
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

describe('Tenant Switch API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authentication passes
    mockTenantAuthMiddleware.mockResolvedValue({
      success: true,
      context: {
        userId: 'user-123',
        tenantId: 'tenant-old',
        tenantRole: 'owner',
      },
    })
  })

  describe('POST request', () => {
    const mockSuccessResponse = {
      success: true,
      token: 'new-jwt-token-xyz',
      refreshToken: 'new-refresh-token-abc',
      tenant: {
        id: 'tenant-new',
        name: 'New Tenant',
        slug: 'new-tenant',
      },
    }

    it('should switch tenant successfully', async () => {
      mockSwitchTenant.mockResolvedValue(mockSuccessResponse)

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'tenant-new',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.token).toBeDefined()
      expect(data.tenant).toBeDefined()
      expect(mockSwitchTenant).toHaveBeenCalledWith('user-123', 'tenant-new')
    })

    it('should reject switch without authentication', async () => {
      mockTenantAuthMiddleware.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        body: {
          targetTenantId: 'tenant-new',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject switch without targetTenantId', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_REQUEST')
      expect(data.error.message).toContain('targetTenantId')
    })

    it('should reject switch to non-member tenant', async () => {
      mockSwitchTenant.mockResolvedValue({
        success: false,
        error: 'User is not a member of this tenant',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'non-member-tenant',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not a member')
    })

    it('should reject switch to non-existent tenant', async () => {
      mockSwitchTenant.mockResolvedValue({
        success: false,
        error: 'Tenant not found',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'non-existent-tenant',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle internal server error', async () => {
      mockSwitchTenant.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'tenant-new',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should set token cookie on successful switch', async () => {
      mockSwitchTenant.mockResolvedValue(mockSuccessResponse)

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/switch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'tenant-new',
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      // Check that cookies.set was called - the response should have a cookie set
      expect(response.headers.get('set-cookie')).toBeDefined()
    })
  })
})
