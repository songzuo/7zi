/**
 * Auth Login API Route Tests
 *
 * 测试登录 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockLoginUser = vi.fn()
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  auth: vi.fn(),
}

vi.mock('@/lib/auth/service', () => ({
  loginUser: () => mockLoginUser,
}))

vi.mock('@/lib/logger', () => ({
  default: () => mockLogger,
}))

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((message: string) => {
    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }),
  createUnauthorizedError: vi.fn((message: string) => {
    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return Promise.resolve(
      new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  }),
}))

vi.mock('@/lib/api/utils', () => ({
  validateEmail: vi.fn((email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }),
  setAuthCookies: vi.fn(),
  createSuccessResponse: vi.fn((data: unknown) => {
    const dataObj = typeof data === 'object' && data !== null ? data : {}
    return new Response(JSON.stringify({ success: true, ...dataObj }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

vi.mock('@/lib/api/api-logger', () => ({
  logRequestStart: vi.fn(() => ({ requestId: 'test-123', path: '/api/auth/login' })),
  logRequestComplete: vi.fn(),
  logRequestError: vi.fn(),
  logAuthError: vi.fn(),
  sanitizeUrlForLogging: vi.fn((url: string) => url),
}))

describe('Auth Login API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login - Success cases', () => {
    it('should login successfully with valid credentials', async () => {
      mockLoginUser.mockResolvedValue({
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

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.token).toBe('access-token-123')
      expect(data.refreshToken).toBe('refresh-token-123')
      expect(data.expiresAt).toBeDefined()
    })

    it('should login successfully with rememberMe=true', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        token: 'access-token-456',
        refreshToken: 'refresh-token-456',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600000),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
          rememberMe: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.refreshToken).toBe('refresh-token-456')
    })

    it('should login successfully with rememberMe=false', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
        },
        token: 'access-token-789',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      expect(data.refreshToken).toBeNull()
    })
  })

  describe('POST /api/auth/login - Validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Email and password are required')
    })

    it('should return 400 when password is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Email and password are required')
    })

    it('should return 400 when both email and password are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Email and password are required')
    })

    it('should return 400 when email format is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email format')
    })

    it('should return 400 when email is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when password is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when email has invalid format with @ but no domain', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when email has invalid format with multiple @', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user123@example.co.uk',
      ]

      for (const email of validEmails) {
        mockLoginUser.mockResolvedValue({
          success: true,
          user: { id: 'user-123', email, username: 'testuser' },
          token: 'access-token',
          refreshToken: null,
          expiresAt: new Date(Date.now() + 3600000),
        })

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: 'SecurePass123',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
      }
    })
  })

  describe('POST /api/auth/login - Authentication errors', () => {
    it('should return 401 when credentials are wrong', async () => {
      mockLoginUser.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'WrongPassword',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid email or password')
    })

    it('should return 401 when user does not exist', async () => {
      mockLoginUser.mockResolvedValue({
        success: false,
        error: 'User not found',
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    it('should return 401 when password is incorrect', async () => {
      mockLoginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'incorrect-password',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/login - Error handling', () => {
    it('should return 500 on database error', async () => {
      mockLoginUser.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database connection failed')
    })

    it('should return 500 on unexpected error', async () => {
      mockLoginUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle missing Content-Type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toBeDefined()
    })
  })

  describe('POST /api/auth/login - Edge cases', () => {
    it('should handle email with leading/trailing whitespace', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        user: { id: 'user-123', email: 'test@example.com', username: 'testuser' },
        token: 'access-token',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  test@example.com  ',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })

    it('should handle very long email address', async () => {
      const longEmail = `a${'a'.repeat(100)}@example.com`

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: longEmail,
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toBeDefined()
    })

    it('should handle special characters in email', async () => {
      mockLoginUser.mockResolvedValue({
        success: true,
        user: { id: 'user-123', email: 'test+special@example.com', username: 'testuser' },
        token: 'access-token',
        refreshToken: null,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test+special@example.com',
          password: 'SecurePass123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
    })
  })
})
