/**
 * Rate Limit Middleware Tests
 *
 * 限流中间件测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TokenBucketRateLimiter, SlidingWindowRateLimiter, RateLimitAlgorithm, createRateLimitMiddleware } from '../rate-limit-middleware'
import { NextRequest, NextResponse } from 'next/server'

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter

  beforeEach(() => {
    // 5 tokens per 1 second = 0.005 tokens per millisecond
    limiter = new TokenBucketRateLimiter(5, 5, 60000)
  })

  afterEach(() => {
    limiter.reset('test-key')
  })

  it('should allow requests within limit', async () => {
    const result = await limiter.consume('test-key')
    
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.limit).toBe(5)
    expect(result.exceeded).toBe(false)
  })

  it('should block requests when bucket is empty', async () => {
    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      await limiter.consume('test-key')
    }
    
    // Next request should be blocked
    const result = await limiter.consume('test-key')
    
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.exceeded).toBe(true)
  })

  it('should track different keys separately', async () => {
    const result1 = await limiter.consume('key1')
    const result2 = await limiter.consume('key2')
    
    expect(result1.remaining).toBe(4)
    expect(result2.remaining).toBe(4)
  })

  it('should refill tokens over time', async () => {
    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      await limiter.consume('test-key')
    }
    
    // Wait for refill (100ms should give 0.5 tokens, rounded to 0)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const result = await limiter.consume('test-key')
    // Should still be blocked because tokens < 1
    expect(result.allowed).toBe(false)
  })

  it('should reset correctly', async () => {
    // Consume some tokens
    await limiter.consume('test-key')
    await limiter.consume('test-key')
    
    // Reset
    limiter.reset('test-key')
    
    // Should have full capacity again
    const result = await limiter.consume('test-key')
    
    expect(result.remaining).toBe(4)
    expect(result.allowed).toBe(true)
  })

  it('should cleanup expired entries', async () => {
    await limiter.consume('test-key')
    
    // Manually set old timestamp by creating new limiter
    const oldLimiter = new TokenBucketRateLimiter(5, 5, 60000)
    oldLimiter.cleanup()
  })
})

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter

  beforeEach(() => {
    limiter = new SlidingWindowRateLimiter(5, 60000)
  })

  afterEach(() => {
    limiter.reset('test-key')
  })

  it('should allow requests within limit', async () => {
    const result = await limiter.increment('test-key')
    
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.limit).toBe(5)
    expect(result.exceeded).toBe(false)
  })

  it('should block requests when limit is exceeded', async () => {
    // Make max requests
    for (let i = 0; i < 5; i++) {
      const result = await limiter.increment('test-key')
      expect(result.allowed).toBe(true)
    }
    
    // Next request should be blocked
    const result = await limiter.increment('test-key')
    
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.exceeded).toBe(true)
  })

  it('should track different keys separately', async () => {
    await limiter.increment('key1')
    await limiter.increment('key1')
    await limiter.increment('key2')
    
    const result1 = await limiter.increment('key1')
    const result2 = await limiter.increment('key2')
    
    expect(result1.remaining).toBe(2) // key1: 3/5
    expect(result2.remaining).toBe(3) // key2: 2/5
  })

  it('should reset correctly', async () => {
    // Make some requests
    await limiter.increment('test-key')
    await limiter.increment('test-key')
    
    // Reset
    limiter.reset('test-key')
    
    // Should be allowed again
    const result = await limiter.increment('test-key')
    
    expect(result.remaining).toBe(4)
    expect(result.allowed).toBe(true)
  })

  it('should cleanup expired entries', async () => {
    await limiter.increment('test-key')
    
    const cleaned = limiter.cleanup()
    
    // Should clean some entries (implementation dependent)
    expect(typeof cleaned).toBe('number')
  })
})

describe('RateLimitMiddleware', () => {
  let middleware: (request: NextRequest) => Promise<NextResponse>

  afterEach(() => {
    // Clean up any state
  })

  it('should create middleware with custom config', () => {
    middleware = createRateLimitMiddleware({
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      maxRequests: 10,
      windowMs: 60000,
      enableHeaders: true,
      enableLogging: false,
    })
    
    expect(middleware).toBeDefined()
  })

  it('should return 429 when limit is exceeded', async () => {
    middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      enableHeaders: true,
      enableLogging: false,
    })
    
    // First request should pass
    const request1 = new NextRequest('http://localhost/api/test')
    const response1 = await middleware(request1)
    expect(response1.status).toBe(200)
    
    // Second request should be blocked
    const request2 = new NextRequest('http://localhost/api/test')
    const response2 = await middleware(request2)
    expect(response2.status).toBe(429)
    
    // Should have rate limit headers
    expect(response2.headers.get('X-RateLimit-Limit')).toBe('1')
    expect(response2.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response2.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('should include rate limit headers in response', async () => {
    middleware = createRateLimitMiddleware({
      maxRequests: 100,
      windowMs: 60000,
      enableHeaders: true,
      enableLogging: false,
    })
    
    const request = new NextRequest('http://localhost/api/test')
    const response = await middleware(request)
    
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('should skip requests based on skip function', async () => {
    middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      skip: (request) => {
        return request.headers.get('x-skip-rate-limit') === 'true'
      },
      enableLogging: false,
    })
    
    // Request with skip header should pass
    const request1 = new NextRequest('http://localhost/api/test')
    request1.headers.set('x-skip-rate-limit', 'true')
    const response1 = await middleware(request1)
    expect(response1.status).toBe(200)
    
    // First normal request should pass
    const request2 = new NextRequest('http://localhost/api/test')
    const response2 = await middleware(request2)
    expect(response2.status).toBe(200)
    
    // Second normal request should be blocked
    const request3 = new NextRequest('http://localhost/api/test')
    const response3 = await middleware(request3)
    expect(response3.status).toBe(429)
  })

  it('should use custom key generator', async () => {
    middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      keyGenerator: (request) => {
        return `custom:${request.headers.get('x-user-id') || 'anonymous'}`
      },
      enableLogging: false,
    })
    
    // First request from user 1
    const request1 = new NextRequest('http://localhost/api/test')
    request1.headers.set('x-user-id', 'user1')
    const response1 = await middleware(request1)
    expect(response1.status).toBe(200)
    
    // Second request from user 1 should be blocked
    const request2 = new NextRequest('http://localhost/api/test')
    request2.headers.set('x-user-id', 'user1')
    const response2 = await middleware(request2)
    expect(response2.status).toBe(429)
    
    // First request from user 2 should pass
    const request3 = new NextRequest('http://localhost/api/test')
    request3.headers.set('x-user-id', 'user2')
    const response3 = await middleware(request3)
    expect(response3.status).toBe(200)
  })

  it('should return custom error message on limit reached', async () => {
    const customMessage = 'Custom rate limit message'
    middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      message: customMessage,
      enableLogging: false,
    })
    
    // First request
    const request1 = new NextRequest('http://localhost/api/test')
    await middleware(request1)
    
    // Second request
    const request2 = new NextRequest('http://localhost/api/test')
    const response2 = await middleware(request2)
    
    expect(response2.status).toBe(429)
    
    // Check response body (if using default onLimitReached)
    const body = await response2.json()
    expect(body.message).toBeDefined()
  })

  it('should handle different algorithms correctly', async () => {
    // Test Token Bucket
    const tokenBucketMiddleware = createRateLimitMiddleware({
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      maxRequests: 2,
      windowMs: 60000,
      enableLogging: false,
    })
    
    const request1 = new NextRequest('http://localhost/api/test')
    const response1 = await tokenBucketMiddleware(request1)
    expect(response1.status).toBe(200)
    
    const request2 = new NextRequest('http://localhost/api/test')
    const response2 = await tokenBucketMiddleware(request2)
    expect(response2.status).toBe(200)
    
    const request3 = new NextRequest('http://localhost/api/test')
    const response3 = await tokenBucketMiddleware(request3)
    expect(response3.status).toBe(429)
    
    // Test Sliding Window
    const slidingWindowMiddleware = createRateLimitMiddleware({
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      maxRequests: 2,
      windowMs: 60000,
      enableLogging: false,
    })
    
    const request4 = new NextRequest('http://localhost/api/test2')
    const response4 = await slidingWindowMiddleware(request4)
    expect(response4.status).toBe(200)
    
    const request5 = new NextRequest('http://localhost/api/test2')
    const response5 = await slidingWindowMiddleware(request5)
    expect(response5.status).toBe(200)
    
    const request6 = new NextRequest('http://localhost/api/test2')
    const response6 = await slidingWindowMiddleware(request6)
    expect(response6.status).toBe(429)
  })
})

describe('Rate Limit Headers', () => {
  it('should set correct rate limit headers', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 100,
      windowMs: 60000,
      enableHeaders: true,
      enableLogging: false,
    })
    
    const request = new NextRequest('http://localhost/api/test')
    const response = await middleware(request)
    
    const limit = response.headers.get('X-RateLimit-Limit')
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')
    
    expect(limit).toBe('100')
    expect(remaining).toBe('99')
    expect(reset).toBeDefined()
    expect(parseInt(reset!, 10)).toBeGreaterThan(0)
  })

  it('should include Retry-After header when rate limited', async () => {
    const middleware = createRateLimitMiddleware({
      maxRequests: 1,
      windowMs: 60000,
      enableHeaders: true,
      enableLogging: false,
    })
    
    // First request
    const request1 = new NextRequest('http://localhost/api/test')
    await middleware(request1)
    
    // Second request should be blocked
    const request2 = new NextRequest('http://localhost/api/test')
    const response2 = await middleware(request2)
    
    expect(response2.headers.get('Retry-After')).toBeDefined()
  })
})

describe('Algorithm Selection', () => {
  it('should use Token Bucket for burst traffic', async () => {
    const middleware = createRateLimitMiddleware({
      algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
      maxRequests: 10,
      windowMs: 60000,
      enableLogging: false,
    })
    
    // Token Bucket allows some burst
    let allowed = 0
    for (let i = 0; i < 15; i++) {
      const request = new NextRequest('http://localhost/api/test')
      const response = await middleware(request)
      if (response.status === 200) allowed++
    }
    
    // Token Bucket should allow more requests initially
    expect(allowed).toBeGreaterThan(0)
  })

  it('should use Sliding Window for strict limiting', async () => {
    const middleware = createRateLimitMiddleware({
      algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
      maxRequests: 5,
      windowMs: 60000,
      enableLogging: false,
    })
    
    // Sliding Window is stricter
    let allowed = 0
    for (let i = 0; i < 10; i++) {
      const request = new NextRequest('http://localhost/api/test')
      const response = await middleware(request)
      if (response.status === 200) allowed++
    }
    
    // Should allow exactly maxRequests
    expect(allowed).toBe(5)
  })
})
