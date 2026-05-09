/**
 * Auth Logout API Route Tests
 *
 * 测试登出 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockLogoutUser = vi.fn()
const mockClearAuthCookies = vi.fn()
const mockCreateSimpleSuccessResponse = vi.fn()

vi.mock('@/lib/auth/service', () => ({
  logoutUser: vi.fn(() => mockLogoutUser()),
}))

vi.mock('@/lib/auth/middleware', () => ({
  withUserAuth: vi.fn((request: NextRequest, handler: (req: NextRequest, context: { userId: string }) => Promise<Response>) => {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.substring(7)

    if (!token || token === 'invalid-token') {
      return Promise.resolve(
        new Response(JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    }

    const userId = token.replace('mock-jwt-token-', '')
    return handler(request, { userId })
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    auth: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    auth: vi.fn(),
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((message: string) => {
    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }),
}))

vi.mock('@/lib/api/utils', () => ({
  clearAuthCookies: vi.fn(() => mockClearAuthCookies()),
  createSimpleSuccessResponse: vi.fn(() => {
    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

function createMockRequest(
  url: string = 'http://localhost:3000/api/auth/logout',
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

describe('Auth Logout API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogoutUser.mockResolvedValue(undefined)
    mockClearAuthCookies.mockImplementation(() => {})
    mockCreateSimpleSuccessResponse.mockImplementation(() => {
      return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
  })

  describe('POST request', () => {
    it('should logout successfully with valid token', async () => {
      const authToken = 'mock-jwt-token-user-123'
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.timestamp).toBeDefined()
      expect(mockLogoutUser).toHaveBeenCalledWith(authToken)
    })

    it('should reject logout without authorization header', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject logout with invalid token', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should call logoutUser with correct token', async () => {
      const authToken = 'mock-jwt-token-user-456'
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      await POST(request)

      expect(mockLogoutUser).toHaveBeenCalledTimes(1)
      expect(mockLogoutUser).toHaveBeenCalledWith(authToken)
    })

    it('should clear auth cookies on successful logout', async () => {
      const authToken = 'mock-jwt-token-user-789'
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockClearAuthCookies).toHaveBeenCalled()
    })

    it('should handle logout service error gracefully', async () => {
      mockLogoutUser.mockRejectedValueOnce(new Error('Service error'))

      const authToken = 'mock-jwt-token-user-error'
      const request = createMockRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
