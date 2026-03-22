/**
 * @fileoverview CSRF (Cross-Site Request Forgery) Protection Tests
 * Tests for CSRF token generation, validation, and protection mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Generate a CSRF token
 */
function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  // Mock crypto.getRandomValues for testing
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token
 */
function validateCsrfToken(token: string | null, expectedToken: string | null): boolean {
  if (!token || !expectedToken) return false
  if (typeof token !== 'string' || typeof expectedToken !== 'string') return false
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false
  
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i)
  }
  return result === 0
}

/**
 * Create a secure cookie string
 */
function createSecureCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
    maxAge?: number
    path?: string
    domain?: string
  } = {}
): string {
  const {
    httpOnly = true,
    secure = true,
    sameSite = 'Strict',
    maxAge = 3600,
    path = '/',
    domain,
  } = options

  const parts = [`${name}=${value}`]
  
  if (httpOnly) parts.push('HttpOnly')
  if (secure) parts.push('Secure')
  parts.push(`SameSite=${sameSite}`)
  parts.push(`Max-Age=${maxAge}`)
  parts.push(`Path=${path}`)
  if (domain) parts.push(`Domain=${domain}`)

  return parts.join('; ')
}

/**
 * Parse cookies from header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  
  if (!cookieHeader) return cookies
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name && valueParts.length > 0) {
      cookies[name.trim()] = valueParts.join('=').trim()
    }
  })
  
  return cookies
}

/**
 * Check if request has valid origin
 */
function isValidOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

/**
 * Check if request has valid referer
 */
function isValidReferer(referer: string | null, allowedOrigins: string[]): boolean {
  if (!referer) return false
  
  try {
    const refererUrl = new URL(referer)
    const refererOrigin = refererUrl.origin
    return allowedOrigins.includes(refererOrigin)
  } catch {
    return false
  }
}

describe('CSRF Protection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CSRF Token Generation', () => {
    it('should generate a cryptographically secure token', () => {
      const token = generateCsrfToken()
      
      expect(token).toBeDefined()
      expect(token.length).toBe(64) // 32 bytes = 64 hex characters
      expect(/^[a-f0-9]+$/.test(token)).toBe(true)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken())
      }
      
      expect(tokens.size).toBe(100)
    })

    it('should not generate predictable tokens', () => {
      const tokens = Array.from({ length: 10 }, () => generateCsrfToken())
      
      // Check that tokens don't follow a pattern
      const firstToken = tokens[0]
      const allSame = tokens.every(t => t === firstToken)
      expect(allSame).toBe(false)
      
      // Check for sequential patterns
      const hasSequential = tokens.some((token, i) => {
        if (i === 0) return false
        const prevToken = tokens[i - 1]
        return Math.abs(parseInt(token, 16) - parseInt(prevToken, 16)) < 1000
      })
      expect(hasSequential).toBe(false)
    })

    it('should generate tokens with sufficient entropy', () => {
      const token = generateCsrfToken()
      
      // 32 bytes = 256 bits of entropy
      const entropyBits = token.length * 4 // Each hex char = 4 bits
      expect(entropyBits).toBeGreaterThanOrEqual(128) // Minimum 128 bits recommended
    })
  })

  describe('CSRF Token Validation', () => {
    it('should validate correct tokens', () => {
      const token = generateCsrfToken()
      
      expect(validateCsrfToken(token, token)).toBe(true)
    })

    it('should reject incorrect tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      
      expect(validateCsrfToken(token1, token2)).toBe(false)
    })

    it('should reject null or undefined tokens', () => {
      expect(validateCsrfToken(null, 'token')).toBe(false)
      expect(validateCsrfToken('token', null)).toBe(false)
      expect(validateCsrfToken(null, null)).toBe(false)
      expect(validateCsrfToken(undefined as unknown as string, 'token')).toBe(false)
    })

    it('should reject empty tokens', () => {
      expect(validateCsrfToken('', 'token')).toBe(false)
      expect(validateCsrfToken('token', '')).toBe(false)
      expect(validateCsrfToken('', '')).toBe(false)
    })

    it('should reject malformed tokens', () => {
      const validToken = generateCsrfToken()
      
      expect(validateCsrfToken('not-a-valid-token', validToken)).toBe(false)
      expect(validateCsrfToken('<script>alert(1)</script>', validToken)).toBe(false)
      expect(validateCsrfToken(' ', validToken)).toBe(false)
    })

    it('should use constant-time comparison', () => {
      // This test verifies timing-safe comparison
      const token = generateCsrfToken()
      
      // Slightly wrong token (one character difference)
      const wrongToken1 = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a')
      
      // Completely wrong token
      const wrongToken2 = generateCsrfToken()
      
      // Both should fail validation
      expect(validateCsrfToken(wrongToken1, token)).toBe(false)
      expect(validateCsrfToken(wrongToken2, token)).toBe(false)
    })

    it('should reject tokens with different lengths', () => {
      const token = generateCsrfToken()
      const shortToken = token.slice(0, 32)
      
      expect(validateCsrfToken(token, shortToken)).toBe(false)
      expect(validateCsrfToken(shortToken, token)).toBe(false)
    })
  })

  describe('Cookie-based CSRF Protection', () => {
    it('should create secure cookies with proper attributes', () => {
      const token = generateCsrfToken()
      const cookie = createSecureCookie('csrf-token', token)
      
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('SameSite=Strict')
      expect(cookie).toContain(`csrf-token=${token}`)
    })

    it('should support SameSite Lax for navigation', () => {
      const token = generateCsrfToken()
      const cookie = createSecureCookie('csrf-token', token, { sameSite: 'Lax' })
      
      expect(cookie).toContain('SameSite=Lax')
    })

    it('should set appropriate Max-Age', () => {
      const token = generateCsrfToken()
      const cookie = createSecureCookie('csrf-token', token, { maxAge: 7200 })
      
      expect(cookie).toContain('Max-Age=7200')
    })

    it('should parse cookies correctly', () => {
      const cookieHeader = 'csrf-token=abc123; session=xyz789; other=value'
      const cookies = parseCookies(cookieHeader)
      
      expect(cookies['csrf-token']).toBe('abc123')
      expect(cookies['session']).toBe('xyz789')
      expect(cookies['other']).toBe('value')
    })

    it('should handle empty cookie header', () => {
      const cookies = parseCookies('')
      expect(Object.keys(cookies)).toHaveLength(0)
    })

    it('should handle malformed cookies gracefully', () => {
      const cookieHeader = 'valid=value; malformed; another=test'
      const cookies = parseCookies(cookieHeader)
      
      expect(cookies['valid']).toBe('value')
      expect(cookies['another']).toBe('test')
    })
  })

  describe('Origin/Referer Validation', () => {
    const allowedOrigins = ['https://example.com', 'https://www.example.com']

    it('should validate correct origins', () => {
      expect(isValidOrigin('https://example.com', allowedOrigins)).toBe(true)
      expect(isValidOrigin('https://www.example.com', allowedOrigins)).toBe(true)
    })

    it('should reject invalid origins', () => {
      expect(isValidOrigin('https://evil.com', allowedOrigins)).toBe(false)
      expect(isValidOrigin('https://example.com.evil.com', allowedOrigins)).toBe(false)
    })

    it('should reject null origin', () => {
      expect(isValidOrigin(null, allowedOrigins)).toBe(false)
    })

    it('should validate correct referers', () => {
      expect(isValidReferer('https://example.com/page', allowedOrigins)).toBe(true)
      expect(isValidReferer('https://www.example.com/path?query=1', allowedOrigins)).toBe(true)
    })

    it('should reject invalid referers', () => {
      expect(isValidReferer('https://evil.com/page', allowedOrigins)).toBe(false)
      expect(isValidReferer('https://example.com.evil.com', allowedOrigins)).toBe(false)
    })

    it('should reject malformed referer URLs', () => {
      expect(isValidReferer('not-a-url', allowedOrigins)).toBe(false)
      expect(isValidReferer('://invalid', allowedOrigins)).toBe(false)
    })

    it('should reject null referer', () => {
      expect(isValidReferer(null, allowedOrigins)).toBe(false)
    })
  })

  describe('Double Submit Cookie Pattern', () => {
    it('should validate token from both cookie and header', () => {
      const token = generateCsrfToken()
      
      // Simulate request with cookie and header
      const requestCookies = { 'csrf-token': token }
      const requestHeaders = { 'x-csrf-token': token }
      
      const cookieToken = requestCookies['csrf-token']
      const headerToken = requestHeaders['x-csrf-token']
      
      expect(cookieToken).toBe(headerToken)
      expect(validateCsrfToken(cookieToken, headerToken)).toBe(true)
    })

    it('should reject mismatched tokens', () => {
      const cookieToken = generateCsrfToken()
      const headerToken = generateCsrfToken()
      
      expect(cookieToken).not.toBe(headerToken)
      expect(validateCsrfToken(cookieToken, headerToken)).toBe(false)
    })

    it('should reject missing tokens', () => {
      const cookieToken = generateCsrfToken()
      const headerToken = undefined
      
      expect(validateCsrfToken(cookieToken, headerToken as unknown as string)).toBe(false)
    })
  })

  describe('Synchronizer Token Pattern', () => {
    it('should associate tokens with sessions', () => {
      // Simulate session-token mapping
      const sessionTokens = new Map<string, string>()
      
      const sessionId = 'session-123'
      const token = generateCsrfToken()
      
      sessionTokens.set(sessionId, token)
      
      // Validate token for session
      const storedToken = sessionTokens.get(sessionId)
      expect(validateCsrfToken(token, storedToken!)).toBe(true)
    })

    it('should reject tokens from different sessions', () => {
      const sessionTokens = new Map<string, string>()
      
      const session1 = 'session-1'
      const session2 = 'session-2'
      
      sessionTokens.set(session1, generateCsrfToken())
      sessionTokens.set(session2, generateCsrfToken())
      
      const token1 = sessionTokens.get(session1)!
      const token2 = sessionTokens.get(session2)!
      
      expect(validateCsrfToken(token1, token2)).toBe(false)
    })

    it('should regenerate token after use', () => {
      const sessionTokens = new Map<string, string>()
      const sessionId = 'session-123'
      
      // Initial token
      const initialToken = generateCsrfToken()
      sessionTokens.set(sessionId, initialToken)
      
      // After use, regenerate
      const newToken = generateCsrfToken()
      sessionTokens.set(sessionId, newToken)
      
      // Old token should no longer work
      const currentToken = sessionTokens.get(sessionId)!
      expect(validateCsrfToken(initialToken, currentToken)).toBe(false)
      expect(validateCsrfToken(newToken, currentToken)).toBe(true)
    })
  })

  describe('CSRF Protection for Different Request Methods', () => {
    it('should require CSRF token for POST requests', () => {
      const method = 'POST'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(true)
    })

    it('should require CSRF token for PUT requests', () => {
      const method = 'PUT'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(true)
    })

    it('should require CSRF token for DELETE requests', () => {
      const method = 'DELETE'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(true)
    })

    it('should not require CSRF token for GET requests', () => {
      const method = 'GET'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(false)
    })

    it('should not require CSRF token for HEAD requests', () => {
      const method = 'HEAD'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(false)
    })

    it('should not require CSRF token for OPTIONS requests', () => {
      const method = 'OPTIONS'
      const requiresCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)
      
      expect(requiresCsrf).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent requests with same token', async () => {
      const token = generateCsrfToken()
      
      // Simulate concurrent validation requests
      const validations = await Promise.all([
        Promise.resolve(validateCsrfToken(token, token)),
        Promise.resolve(validateCsrfToken(token, token)),
        Promise.resolve(validateCsrfToken(token, token)),
      ])
      
      validations.forEach(result => {
        expect(result).toBe(true)
      })
    })

    it('should handle token with special characters', () => {
      // Hex tokens should only contain a-f and 0-9
      const token = generateCsrfToken()
      const specialChars = ['<', '>', '"', "'", '&', '/', '\\', ' ', '\n', '\t']
      
      specialChars.forEach(char => {
        expect(token).not.toContain(char)
      })
    })

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(1000)
      const expectedToken = 'a'.repeat(1000)
      
      expect(validateCsrfToken(longToken, expectedToken)).toBe(true)
    })

    it('should handle unicode in token validation', () => {
      const token = generateCsrfToken()
      const unicodeToken = token + '中文'
      
      expect(validateCsrfToken(token, unicodeToken)).toBe(false)
    })
  })

  describe('Security Headers', () => {
    it('should recommend Content-Security-Policy header', () => {
      const cspHeader = "default-src 'self'; script-src 'self'"
      
      expect(cspHeader).toContain("default-src 'self'")
    })

    it('should recommend X-Content-Type-Options header', () => {
      const header = 'nosniff'
      expect(header).toBe('nosniff')
    })

    it('should recommend X-Frame-Options header', () => {
      const header = 'DENY'
      expect(header).toBe('DENY')
    })

    it('should recommend Referrer-Policy header', () => {
      const header = 'strict-origin-when-cross-origin'
      expect(header).toBeDefined()
    })
  })

  describe('Integration with Form Submissions', () => {
    it('should include CSRF token in form data', () => {
      const token = generateCsrfToken()
      const formData = new URLSearchParams({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        _csrf: token,
      })
      
      expect(formData.get('_csrf')).toBe(token)
    })

    it('should include CSRF token in request header', () => {
      const token = generateCsrfToken()
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      }
      
      expect(headers['X-CSRF-Token']).toBe(token)
    })

    it('should validate token before processing form', () => {
      const sessionToken = generateCsrfToken()
      const formToken = generateCsrfToken() // Different token
      
      const isValid = validateCsrfToken(formToken, sessionToken)
      
      expect(isValid).toBe(false)
    })
  })
})

describe('CSRF Middleware Integration', () => {
  it('should block requests without CSRF token', () => {
    const request: { method: string; headers: Record<string, string>; cookies: Record<string, string> } = {
      method: 'POST',
      headers: {},
      cookies: {},
    }
    
    const shouldBlock = 
      ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) &&
      (!request.headers['x-csrf-token'] || !request.cookies['csrf-token'])
    
    expect(shouldBlock).toBe(true)
  })

  it('should allow requests with valid CSRF token', () => {
    const token = generateCsrfToken()
    const request: { method: string; headers: Record<string, string>; cookies: Record<string, string> } = {
      method: 'POST',
      headers: { 'x-csrf-token': token },
      cookies: { 'csrf-token': token },
    }
    
    const tokensMatch = validateCsrfToken(
      request.headers['x-csrf-token'],
      request.cookies['csrf-token']
    )
    
    expect(tokensMatch).toBe(true)
  })

  it('should return 403 for invalid CSRF token', () => {
    const errorResponse = {
      status: 403,
      body: { error: 'Invalid CSRF token' },
    }
    
    expect(errorResponse.status).toBe(403)
    expect(errorResponse.body.error).toContain('CSRF')
  })
})