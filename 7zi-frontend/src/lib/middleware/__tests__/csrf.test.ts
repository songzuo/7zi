/**
 * CSRF Middleware Tests
 *
 * Tests for CSRF protection middleware
 * @version 1.13.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withCSRF, generateCSRFToken, verifyToken, requiresCSRFProtection } from '../csrf'

// Mock crypto.getRandomValues
const mockRandomValues = vi.fn()
global.crypto = {
  getRandomValues: mockRandomValues,
} as any

describe('CSRF Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock random values for predictable tokens
    mockRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i % 256
      }
    })
  })

  describe('requiresCSRFProtection', () => {
    it('should return true for POST requests', () => {
      expect(requiresCSRFProtection('POST')).toBe(true)
    })

    it('should return true for PUT requests', () => {
      expect(requiresCSRFProtection('PUT')).toBe(true)
    })

    it('should return true for DELETE requests', () => {
      expect(requiresCSRFProtection('DELETE')).toBe(true)
    })

    it('should return true for PATCH requests', () => {
      expect(requiresCSRFProtection('PATCH')).toBe(true)
    })

    it('should return false for GET requests', () => {
      expect(requiresCSRFProtection('GET')).toBe(false)
    })

    it('should return false for HEAD requests', () => {
      expect(requiresCSRFProtection('HEAD')).toBe(false)
    })

    it('should return false for OPTIONS requests', () => {
      expect(requiresCSRFProtection('OPTIONS')).toBe(false)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = 'test-token'
      const timestamp = Math.floor(Date.now() / 1000)
      const signedToken = Buffer.from(`${token}:${timestamp}`).toString('base64')

      const result = verifyToken(signedToken)

      expect(result.valid).toBe(true)
      expect(result.token).toBe(token)
    })

    it('should reject an expired token', () => {
      const token = 'test-token'
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 4000 // More than 1 hour ago
      const signedToken = Buffer.from(`${token}:${expiredTimestamp}`).toString('base64')

      const result = verifyToken(signedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token expired')
    })

    it('should reject a malformed token', () => {
      const malformedToken = 'invalid-token-format'

      const result = verifyToken(malformedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token format')
    })

    it('should reject a token without timestamp', () => {
      const token = 'test-token'
      const signedToken = Buffer.from(token).toString('base64')

      const result = verifyToken(signedToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid token format')
    })
  })

  describe('generateCSRFToken', () => {
    it('should generate a token and set cookie', () => {
      const response = new NextResponse()
      const result = generateCSRFToken(response)

      expect(result).toBe(response)
      expect(result.cookies.get('csrf_token')).toBeDefined()
    })

    it('should create a new response if none provided', () => {
      const result = generateCSRFToken()

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.cookies.get('csrf_token')).toBeDefined()
    })

    it('should set cookie with correct attributes', () => {
      const response = new NextResponse()
      generateCSRFToken(response)

      const cookie = response.cookies.get('csrf_token')

      expect(cookie).toBeDefined()
      expect(cookie?.httpOnly).toBe(true)
      expect(cookie?.sameSite).toBe('strict')
      expect(cookie?.path).toBe('/')
    })
  })

  describe('withCSRF middleware', () => {
    it('should allow GET requests without CSRF token', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      })

      const response = await wrappedHandler(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('should allow HEAD requests without CSRF token', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
      })

      const response = await wrappedHandler(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('should reject POST requests without CSRF token cookie', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'some-token',
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('CSRF token cookie missing')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should reject POST requests without CSRF token header', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const token = 'test-token'
      const timestamp = Math.floor(Date.now() / 1000)
      const signedToken = Buffer.from(`${token}:${timestamp}`).toString('base64')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${signedToken}`,
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain("CSRF token header 'X-CSRF-Token' missing")
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should reject POST requests with mismatched tokens', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const timestamp = Math.floor(Date.now() / 1000)
      const cookieToken = Buffer.from(`token1:${timestamp}`).toString('base64')
      const headerToken = Buffer.from(`token2:${timestamp}`).toString('base64')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${cookieToken}`,
          'X-CSRF-Token': headerToken,
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('CSRF token mismatch')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should allow POST requests with matching valid tokens', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const token = 'test-token'
      const timestamp = Math.floor(Date.now() / 1000)
      const signedToken = Buffer.from(`${token}:${timestamp}`).toString('base64')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${signedToken}`,
          'X-CSRF-Token': signedToken,
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledWith(request)
    })

    it('should reject requests from invalid origin', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const token = 'test-token'
      const timestamp = Math.floor(Date.now() / 1000)
      const signedToken = Buffer.from(`${token}:${timestamp}`).toString('base64')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${signedToken}`,
          'X-CSRF-Token': signedToken,
          Origin: 'https://malicious-site.com',
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Invalid origin')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should allow requests from same origin', async () => {
      const mockHandler = vi.fn().mockResolvedValue(new NextResponse('OK'))
      const wrappedHandler = withCSRF(mockHandler)

      const token = 'test-token'
      const timestamp = Math.floor(Date.now() / 1000)
      const signedToken = Buffer.from(`${token}:${timestamp}`).toString('base64')

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          Cookie: `csrf_token=${signedToken}`,
          'X-CSRF-Token': signedToken,
          Origin: 'http://localhost:3000',
        },
      })

      const response = await wrappedHandler(request)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledWith(request)
    })
  })
})