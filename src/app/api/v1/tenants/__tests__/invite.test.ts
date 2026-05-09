/**
 * Tenant Invite API Route Tests
 *
 * 测试租户邀请 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockTenantAuthMiddleware = vi.fn()
const mockInviteToTenant = vi.fn()

vi.mock('@/lib/auth/tenant', () => ({
  tenantAuthService: {
    inviteToTenant: vi.fn((...args: unknown[]) => mockInviteToTenant(...args)),
    switchTenant: vi.fn(),
    login: vi.fn(),
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
  url: string = 'http://localhost:3000/api/v1/tenants/invite',
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

describe('Tenant Invite API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authentication passes
    mockTenantAuthMiddleware.mockResolvedValue({
      success: true,
      context: {
        userId: 'user-123',
        tenantId: 'tenant-123',
        tenantRole: 'owner',
      },
    })
  })

  describe('POST request', () => {
    const validInviteBody = {
      targetTenantId: 'tenant-456',
      email: 'newuser@example.com',
      role: 'member',
    }

    const mockSuccessResponse = {
      success: true,
      inviteId: 'invite-789',
      message: 'Invitation sent successfully',
    }

    it('should send invitation successfully with valid parameters', async () => {
      mockInviteToTenant.mockResolvedValue(mockSuccessResponse)

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: validInviteBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.inviteId).toBeDefined()
      expect(mockInviteToTenant).toHaveBeenCalled()
    })

    it('should reject invitation without authentication', async () => {
      mockTenantAuthMiddleware.mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        body: validInviteBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should reject invitation without targetTenantId', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          email: 'newuser@example.com',
          role: 'member',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_REQUEST')
      expect(data.error.message).toContain('targetTenantId')
    })

    it('should reject invitation without email', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'tenant-456',
          role: 'member',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('email')
    })

    it('should reject invitation without role', async () => {
      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          targetTenantId: 'tenant-456',
          email: 'newuser@example.com',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('role')
    })

    it('should handle invitation failure', async () => {
      mockInviteToTenant.mockResolvedValue({
        success: false,
        error: 'User is already a member',
      })

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: validInviteBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle internal server error', async () => {
      mockInviteToTenant.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('http://localhost:3000/api/v1/tenants/invite', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: validInviteBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
