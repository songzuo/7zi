/**
 * Auth Token API Route Tests
 *
 * 测试 Token API 路由的完整功能 (OAuth 2.0 compliant)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock dependencies
const mockLoginUser = vi.fn()
const mockAuthenticateAgent = vi.fn()
const mockLogAuditEvent = vi.fn()
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  auth: vi.fn(),
}

vi.mock('@/lib/auth/service', () => ({
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
}))

vi.mock('@/lib/agents/core/auth-service', () => ({
  authenticateAgent: (...args: unknown[]) => mockAuthenticateAgent(...args),
}))

vi.mock('@/lib/auth/audit-logger', () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
  AuditEventType: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    AGENT_AUTHENTICATED: 'AGENT_AUTHENTICATED',
    AGENT_AUTH_FAILURE: 'AGENT_AUTH_FAILURE',
  },
  AuditSeverity: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}))

function createMockRequest(
  url: string = 'http://localhost:3000/api/auth/token',
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

describe('Auth Token API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogAuditEvent.mockResolvedValue(undefined)
  })

  describe('POST request - password grant', () => {
    const validPasswordGrantBody = {
      grant_type: 'password',
      username: 'test@example.com',
      password: 'SecurePass123',
    }

    const mockLoginResult = {
      success: true,
      user: { id: 'user-123', email: 'test@example.com', role: 'member' },
      token: 'jwt-access-token-abc',
      refreshToken: 'refresh-token-xyz',
      expiresAt: new Date(Date.now() + 3600000),
    }

    it('should return access token with valid credentials', async () => {
      mockLoginUser.mockResolvedValue(mockLoginResult)

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: validPasswordGrantBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.access_token).toBeDefined()
      expect(data.token_type).toBe('Bearer')
      expect(data.expires_in).toBeGreaterThan(0)
      expect(data.refresh_token).toBeDefined()
      expect(mockLoginUser).toHaveBeenCalledWith({ email: 'test@example.com', password: 'SecurePass123' })
    })

    it('should reject password grant without username', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'password',
          password: 'SecurePass123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_grant')
      expect(data.error_description).toContain('Username and password are required')
    })

    it('should reject password grant without password', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'password',
          username: 'test@example.com',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_grant')
    })

    it('should reject password grant with invalid credentials', async () => {
      mockLoginUser.mockResolvedValue({
        success: false,
        error: 'Invalid email or password',
      })

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'password',
          username: 'test@example.com',
          password: 'WrongPassword123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('invalid_grant')
      expect(data.error_description).toContain('Invalid email or password')
      expect(mockLogAuditEvent).toHaveBeenCalled()
    })

    it('should reject unsupported grant type', async () => {
      // Zod validation catches unknown enum values first
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'authorization_code',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_request')
    })

    it('should log successful login audit event', async () => {
      mockLoginUser.mockResolvedValue(mockLoginResult)

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: validPasswordGrantBody,
      })

      await POST(request)

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LOGIN_SUCCESS',
          userId: 'user-123',
          result: 'success',
        })
      )
    })

    it('should log failed login audit event', async () => {
      mockLoginUser.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      })

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: validPasswordGrantBody,
      })

      await POST(request)

      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'LOGIN_FAILURE',
          result: 'failure',
        })
      )
    })
  })

  describe('POST request - api_key grant', () => {
    const validApiKeyGrantBody = {
      grant_type: 'api_key',
      api_key: 'test-api-key-123',
      agent_id: 'agent-456',
    }

    const mockAgentAuthResult = {
      agent: { id: 'agent-456', name: 'Test Agent', role: 'agent' },
      token: {
        token: 'agent-access-token-xyz',
        refreshToken: 'agent-refresh-token-abc',
        expiresAt: new Date(Date.now() + 7200000),
      },
    }

    it('should return access token with valid API key', async () => {
      mockAuthenticateAgent.mockResolvedValue(mockAgentAuthResult)

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: validApiKeyGrantBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.access_token).toBeDefined()
      expect(data.token_type).toBe('Bearer')
      expect(data.refresh_token).toBeDefined()
      expect(mockAuthenticateAgent).toHaveBeenCalledWith({
        agentId: 'agent-456',
        apiKey: 'test-api-key-123',
      })
    })

    it('should reject api_key grant without api_key', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'api_key',
          agent_id: 'agent-456',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_grant')
      expect(data.error_description).toContain('API key is required')
    })

    it('should reject api_key grant without agent_id', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'api_key',
          api_key: 'test-api-key-123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_grant')
      expect(data.error_description).toContain('Agent ID is required')
    })

    it('should reject api_key grant with invalid API key', async () => {
      mockAuthenticateAgent.mockResolvedValue(null)

      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: validApiKeyGrantBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('invalid_grant')
      expect(data.error_description).toContain('Invalid API key')
    })

    it('should reject client_credentials grant (not implemented)', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'client_credentials',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('unsupported_grant_type')
      expect(data.error_description).toContain('Client credentials grant not yet implemented')
    })
  })

  describe('POST request - validation', () => {
    it('should reject request with invalid JSON', async () => {
      const urlObj = new URL('http://localhost:3000/api/auth/token')
      const request = new Request(urlObj, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(request)
      // Should handle parse error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should reject request with invalid email format', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          grant_type: 'password',
          username: 'not-an-email',
          password: 'SecurePass123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_request')
    })

    it('should handle missing grant_type', async () => {
      const request = createMockRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        body: {
          username: 'test@example.com',
          password: 'SecurePass123',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_request')
    })
  })
})
