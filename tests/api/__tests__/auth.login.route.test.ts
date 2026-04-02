/**
 * Auth Login API 路由单元测试
 *
 * 测试 /api/auth/login 端点的功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/auth/service', () => ({
  loginUser: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    auth: vi.fn(),
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((message: string) => {
    return {
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      }),
    }
  }),
  createUnauthorizedError: vi.fn((message: string) => {
    return {
      status: 401,
      json: async () => ({
        success: false,
        error: {
          code: 'AUTH_FAILED',
          message,
        },
      }),
    }
  }),
  createErrorResponse: vi.fn((error: any) => {
    return {
      status: 500,
      json: async () => ({
        success: false,
        error: error.message || 'An error occurred',
      }),
    }
  }),
}))

vi.mock('@/lib/api/utils', () => ({
  validateEmail: vi.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }),
  setAuthCookies: vi.fn(),
  createSuccessResponse: vi.fn((data: any) => {
    return {
      status: 200,
      json: async () => ({
        success: true,
        data,
      }),
    }
  }),
}))

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({
    requestId: 'test-request-id',
    timestamp: Date.now(),
    method: 'POST',
    path: '/api/auth/login',
  })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  logAuthError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url: string) => url),
}))

describe('Auth Login API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/auth/login - Normal flow', () => {
    it('should login successfully with valid credentials', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        token: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          rememberMe: false,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toHaveProperty('id', 'user-123')
      expect(data.data.user).toHaveProperty('email', 'test@example.com')
      expect(data.data.token).toBe('access-token-123')
      expect(data.data.refreshToken).toBe('refresh-token-123')
      expect(data.data.expiresAt).toBeDefined()
    })

    it('should login without remember me flag', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        token: 'access-token-123',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.refreshToken).toBeNull()
    })
  })

  describe('POST /api/auth/login - Validation errors', () => {
    it('should return validation error when email is missing', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Email and password are required')
    })

    it('should return validation error when password is missing', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Email and password are required')
    })

    it('should return validation error when both email and password are missing', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error for invalid email format', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid email format')
    })

    it('should return validation error for empty email', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: '',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return validation error for empty password', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/login - Authentication errors', () => {
    it('should return 401 for invalid credentials', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AUTH_FAILED')
      expect(data.error.message).toContain('Invalid email or password')
    })

    it('should return 401 for non-existent user', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'User not found',
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should return 401 when user is disabled', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: false,
        error: 'Account is disabled',
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'disabled@example.com',
          password: 'Password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/login - Edge cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle empty request body', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle service errors gracefully', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockRejectedValue(new Error('Database connection failed'))

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle null user in successful login', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: null,
        token: 'token-123',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should set auth cookies on successful login', async () => {
      const { loginUser } = await import('@/lib/auth/service')
      const { setAuthCookies } = await import('@/lib/api/utils')

      vi.mocked(loginUser).mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        token: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { POST } = await import('@/app/api/auth/login/route')
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123',
          rememberMe: true,
        }),
      })

      await POST(request)

      expect(setAuthCookies).toHaveBeenCalledWith(
        expect.any(Object),
        'access-token-123',
        'refresh-token-123',
        true
      )
    })
  })
})
