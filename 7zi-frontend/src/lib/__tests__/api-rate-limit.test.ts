/**
 * Rate Limit Integration Tests
 *
 * Tests for rate limiting applied to API endpoints
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, RATE_LIMIT_PRESETS, cleanupRateLimiters } from '../api-rate-limit'

describe('API Rate Limit Integration', () => {
  beforeEach(() => {
    // Clean up limiters before each test
    cleanupRateLimiters()
  })

  beforeAll(() => {
    // Clean up any existing limiters
    cleanupRateLimiters()
  })

  afterAll(() => {
    // Final cleanup
    cleanupRateLimiters()
  })

  describe('Strict Rate Limiting (Auth endpoints)', () => {
    it('should allow requests within limit', async () => {
      let requestCount = 0

      const handler = withRateLimit(RATE_LIMIT_PRESETS.strict, async (req: NextRequest) => {
        requestCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 3 requests (within 5/min limit)
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
        })

        const response = await handler(request)

        expect(response.status).toBe(200)
        expect(requestCount).toBe(i + 1)
      }
    })

    it('should block requests exceeding limit', async () => {
      let blockedCount = 0
      let allowedCount = 0

      const handler = withRateLimit(RATE_LIMIT_PRESETS.strict, async (req: NextRequest) => {
        allowedCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 7 requests (exceeds 5/min limit)
      for (let i = 0; i < 7; i++) {
        const request = new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
        })

        const response = await handler(request)

        if (response.status === 429) {
          blockedCount++
        } else {
          expect(response.status).toBe(200)
        }
      }

      expect(allowedCount).toBe(5)
      expect(blockedCount).toBe(2)
    })

    it('should include rate limit headers', async () => {
      const handler = withRateLimit(RATE_LIMIT_PRESETS.strict, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
      })

      const response = await handler(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should include Retry-After header on rate limit exceeded', async () => {
      const handler = withRateLimit(RATE_LIMIT_PRESETS.strict, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      let blockedResponse: NextResponse | null = null

      // Make 7 requests to trigger rate limit
      for (let i = 0; i < 7; i++) {
        const request = new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
        })

        const response = await handler(request)

        if (response.status === 429) {
          blockedResponse = response
          break
        }
      }

      expect(blockedResponse).not.toBeNull()
      expect(blockedResponse!.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Moderate Rate Limiting (Feedback endpoints)', () => {
    it('should allow moderate request rate', async () => {
      let allowedCount = 0

      const handler = withRateLimit(RATE_LIMIT_PRESETS.moderate, async (req: NextRequest) => {
        allowedCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 5 requests (within 10/min limit)
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
        })

        const response = await handler(request)

        expect(response.status).toBe(200)
      }

      expect(allowedCount).toBe(5)
    })

    it('should return appropriate error message', async () => {
      const handler = withRateLimit(RATE_LIMIT_PRESETS.moderate, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      let blockedResponse: NextResponse | null = null

      // Make 12 requests to trigger rate limit
      for (let i = 0; i < 12; i++) {
        const request = new NextRequest('http://localhost/api/feedback', {
          method: 'POST',
        })

        const response = await handler(request)

        if (response.status === 429) {
          blockedResponse = response
          break
        }
      }

      expect(blockedResponse).not.toBeNull()

      const body = await blockedResponse!.json()
      expect(body.error).toBe('Rate limit exceeded')
      expect(body.message).toBe('Too many requests. Please slow down.')
      expect(body.retryAfter).toBeDefined()
    })
  })

  describe('Relaxed Rate Limiting (General API)', () => {
    it('should allow high request rate', async () => {
      let allowedCount = 0

      const handler = withRateLimit(RATE_LIMIT_PRESETS.relaxed, async (req: NextRequest) => {
        allowedCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 50 requests (within 100/min limit)
      for (let i = 0; i < 50; i++) {
        const request = new NextRequest('http://localhost/api/projects', {
          method: 'POST',
        })

        const response = await handler(request)

        expect(response.status).toBe(200)
      }

      expect(allowedCount).toBe(50)
    })
  })

  describe('Search Rate Limiting', () => {
    it('should limit search requests', async () => {
      let allowedCount = 0

      const handler = withRateLimit(RATE_LIMIT_PRESETS.search, async (req: NextRequest) => {
        allowedCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 35 requests (exceeds 30/min limit)
      for (let i = 0; i < 35; i++) {
        const request = new NextRequest('http://localhost/api/search', {
          method: 'POST',
        })

        const response = await handler(request)

        if (i < 30) {
          expect(response.status).toBe(200)
        }
      }

      expect(allowedCount).toBe(30)
    })
  })

  describe('Custom Rate Limit Config', () => {
    it('should work with custom config', async () => {
      const customConfig = {
        windowMs: 1000, // 1 second
        maxRequests: 3,
        message: 'Custom limit exceeded',
      }

      let allowedCount = 0

      const handler = withRateLimit(customConfig, async (req: NextRequest) => {
        allowedCount++
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 5 requests (exceeds 3/sec limit)
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost/api/custom', {
          method: 'POST',
        })

        const response = await handler(request)

        if (i < 3) {
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(429)
        }
      }

      expect(allowedCount).toBe(3)
    })

    it('should use custom error message', async () => {
      const customConfig = {
        windowMs: 1000,
        maxRequests: 1,
        message: 'Custom rate limit message',
      }

      const handler = withRateLimit(customConfig, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      let blockedResponse: NextResponse | null = null

      // Make 2 requests
      for (let i = 0; i < 2; i++) {
        const request = new NextRequest('http://localhost/api/custom', {
          method: 'POST',
        })

        const response = await handler(request)

        if (response.status === 429) {
          blockedResponse = response
        }
      }

      expect(blockedResponse).not.toBeNull()

      const body = await blockedResponse!.json()
      expect(body.message).toBe('Custom rate limit message')
    })
  })

  describe('Per-Endpoint Rate Limiting', () => {
    it('should have independent limits for different endpoints', async () => {
      const strictHandler = withRateLimit(RATE_LIMIT_PRESETS.strict, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      const relaxedHandler = withRateLimit(RATE_LIMIT_PRESETS.relaxed, async (req: NextRequest) => {
        return new NextResponse(JSON.stringify({ success: true }), { status: 200 })
      })

      // Make 7 requests to strict endpoint (should block after 5)
      let strictAllowed = 0
      let strictBlocked = 0
      for (let i = 0; i < 7; i++) {
        const request = new NextRequest('http://localhost/api/auth/login', {
          method: 'POST',
        })

        const response = await strictHandler(request)

        if (response.status === 429) {
          strictBlocked++
        } else {
          strictAllowed++
        }
      }

      expect(strictAllowed).toBe(5)
      expect(strictBlocked).toBe(2)

      // Make 7 requests to relaxed endpoint (should all pass)
      let relaxedAllowed = 0
      for (let i = 0; i < 7; i++) {
        const request = new NextRequest('http://localhost/api/projects', {
          method: 'POST',
        })

        const response = await relaxedHandler(request)

        expect(response.status).toBe(200)
        relaxedAllowed++
      }

      expect(relaxedAllowed).toBe(7)
    })
  })
})
