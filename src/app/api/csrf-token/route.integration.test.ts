/**
 * CSRF Token API Route Integration Tests
 * Real integration tests for /api/csrf-token endpoint
 * Tests against actual token generation logic
 *
 * Note: The cookies() API from Next.js requires request context,
 * so we mock it at the route level while testing the actual handler logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from './route'
import { cookies } from 'next/headers'

// Mock the cookies API
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

describe('/api/csrf-token Integration Tests', () => {
  let mockCookieStore: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockCookieStore = {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
    }
    vi.mocked(cookies).mockImplementation(() => Promise.resolve(mockCookieStore as any))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/csrf-token', () => {
    it('should return 200 status', async () => {
      const response = await GET()
      expect(response.status).toBe(200)
    })

    it('should return JSON content type', async () => {
      const response = await GET()
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return success response with csrfToken', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('csrfToken')
      expect(data).toHaveProperty('timestamp')
    })

    it('should generate a valid hex token', async () => {
      const response = await GET()
      const data = await response.json()

      const { csrfToken } = data.data

      // Token should be a 64-character hex string (256 bits)
      expect(typeof csrfToken).toBe('string')
      expect(csrfToken.length).toBe(64)
      expect(csrfToken).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate unique tokens on each request', async () => {
      const response1 = await GET()
      const response2 = await GET()
      const response3 = await GET()

      const data1 = await response1.json()
      const data2 = await response2.json()
      const data3 = await response3.json()

      // All tokens should be unique
      expect(data1.data.csrfToken).not.toBe(data2.data.csrfToken)
      expect(data2.data.csrfToken).not.toBe(data3.data.csrfToken)
      expect(data1.data.csrfToken).not.toBe(data3.data.csrfToken)
    })

    it('should include expiresAt timestamp', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.data).toHaveProperty('expiresAt')

      const expiresAt = new Date(data.data.expiresAt)
      const now = new Date()

      // Token should expire in the future
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())

      // Token should expire in roughly 1 hour (60 minutes)
      const oneHourFromNow = now.getTime() + 65 * 60 * 1000
      const fiveMinutesFromNow = now.getTime() + 55 * 60 * 1000
      expect(expiresAt.getTime()).toBeLessThan(oneHourFromNow)
      expect(expiresAt.getTime()).toBeGreaterThan(fiveMinutesFromNow)
    })

    it('should set CSRF cookie', async () => {
      await GET()

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      )
    })

    it('should set cookie with 64-character token value', async () => {
      await GET()

      const setCall = mockCookieStore.set.mock.calls[0]
      const tokenValue = setCall[1]

      expect(tokenValue).toHaveLength(64)
      expect(tokenValue).toMatch(/^[0-9a-f]+$/)
    })

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV
      ;(process.env as any).NODE_ENV = 'production'

      await GET()

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      )
      ;(process.env as any).NODE_ENV = originalEnv
    })

    it('should set sameSite to strict', async () => {
      await GET()

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'csrf_token',
        expect.any(String),
        expect.objectContaining({
          sameSite: 'strict',
        })
      )
    })
  })

  describe('POST /api/csrf-token (Token Validation)', () => {
    it('should validate matching tokens', async () => {
      // First get a token
      const getResponse = await GET()
      const getData = await getResponse.json()
      const token = getData.data.csrfToken

      // Mock cookie to return the same token
      mockCookieStore.get.mockReturnValueOnce({ value: token })

      // Now validate it
      const validateRequest = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csrfToken: token }),
      })

      const response = await POST(validateRequest)
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('valid', true)
    })

    it('should reject mismatched tokens', async () => {
      // Get a token but mock cookie to return different value
      const getResponse = await GET()
      const getData = await getResponse.json()

      // Cookie returns a different token
      mockCookieStore.get.mockReturnValueOnce({ value: 'a'.repeat(64) })

      const validateRequest = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csrfToken: getData.data.csrfToken }),
      })

      const response = await POST(validateRequest)

      expect(response.status).toBe(403)

      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data.error).toHaveProperty('type', 'FORBIDDEN')
    })

    it('should reject missing cookie token', async () => {
      // Mock cookie to return nothing
      mockCookieStore.get.mockReturnValueOnce(undefined)

      const validateRequest = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csrfToken: 'a'.repeat(64) }),
      })

      const response = await POST(validateRequest)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('success', false)
    })

    it('should reject invalid token format', async () => {
      // Mock cookie to return a valid token
      mockCookieStore.get.mockReturnValueOnce({ value: 'a'.repeat(64) })

      const validateRequest = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csrfToken: 'invalid-token' }),
      })

      const response = await POST(validateRequest)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data.error).toHaveProperty('type', 'VALIDATION_ERROR')
    })

    it('should reject tampered tokens', async () => {
      // Get a valid token
      const getResponse = await GET()
      const getData = await getResponse.json()
      const token = getData.data.csrfToken

      // Cookie returns the original token
      mockCookieStore.get.mockReturnValueOnce({ value: token })

      // Tamper with it
      const tamperedToken = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a')

      const validateRequest = new Request('http://localhost:3000/api/csrf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csrfToken: tamperedToken }),
      })

      const response = await POST(validateRequest)

      expect(response.status).toBe(403)
    })
  })

  describe('Security', () => {
    it('should generate cryptographically strong tokens', async () => {
      const response = await GET()
      const data = await response.json()

      const { csrfToken } = data.data

      // Token should be 64 hex characters = 256 bits of entropy
      expect(csrfToken.length).toBe(64)

      // Check entropy - should have mix of characters
      const uniqueChars = new Set(csrfToken.split('')).size
      expect(uniqueChars).toBeGreaterThan(10)
    })

    it('should not expose internal secrets in response', async () => {
      const response = await GET()
      const data = await response.json()

      // Should not expose internal information
      expect(data).not.toHaveProperty('secret')
      expect(data).not.toHaveProperty('password')
      expect(data).not.toHaveProperty('key')
      expect(data).not.toHaveProperty('internal')
    })
  })

  describe('Performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now()
      await GET()
      const duration = Date.now() - start

      // Should respond in less than 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})
