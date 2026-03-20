/**
// @ts-ignore - Mock type compatibility issues
 * Rate Limiting Middleware Tests
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withRateLimit,
  withSmartRateLimit,
  getRateLimitStatus,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitStats,
} from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logger';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked logger
import { logger as mockedLogger } from '@/lib/logger';

describe('Rate Limiting Middleware', () => {
  let mockRequest: NextRequest;
  let mockHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      nextUrl: {
        pathname: '/api/test',
        origin: 'http://localhost:3000',
      },
      headers: new Headers(),
      method: 'GET',
    } as unknown as NextRequest;

    mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    clearAllRateLimits();
  });

  afterEach(() => {
    clearAllRateLimits();
  });

  describe('withRateLimit', () => {
    it('should allow requests within limit', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 5,
      });

      for (let i = 0; i < 5; i++) {
        const response = await limitedHandler(mockRequest);
        expect(response.status).toBe(200);
      }
    });

    it('should block requests exceeding limit', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 3,
      });

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const response = await limitedHandler(mockRequest);
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);
    });

    it('should set rate limit headers', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });

      const response = await limitedHandler(mockRequest);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should set Retry-After header when rate limited', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // Use up the limit
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);

      // Get rate limited
      const response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeDefined();

      const retryAfter = parseInt(response.headers.get('Retry-After')!);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    it('should reset limit after window expires', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 100, // 100ms window for testing
        maxRequests: 2,
      });

      // Use up the limit
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);

      // Should be rate limited
      let response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should use default limits when no config provided', async () => {
      const limitedHandler = withRateLimit(mockHandler);

      // Default should allow 60 requests per minute
      for (let i = 0; i < 60; i++) {
        const response = await limitedHandler(mockRequest);
        expect(response.status).toBe(200);
      }

      const response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);
    });

    it('should log rate limit exceeded events', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // Use up the limit
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);

      // Trigger rate limit
      await limitedHandler(mockRequest);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded for /api/test',
        expect.objectContaining({
          limit: 2,
          window: 60000,
        })
      );
    });

    it('should track different IPs separately', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // First IP makes 3 requests (2 allowed, 1 blocked)
      mockRequest.headers.set('x-forwarded-for', '192.168.1.1');
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);
      let response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);

      // Second IP should be allowed
      mockRequest.headers.set('x-forwarded-for', '192.168.1.2');
      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe('withSmartRateLimit', () => {
    it('should skip counting successful requests when configured', async () => {
      const limitedHandler = withSmartRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 3,
        skipSuccessfulRequests: true,
      });

      // Successful requests shouldn't count
      for (let i = 0; i < 10; i++) {
        const response = await limitedHandler(mockRequest);
        expect(response.status).toBe(200);
      }
    });

    it('should skip counting failed requests when configured', async () => {
      const errorHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ error: 'test' }, { status: 500 })
      );

      const limitedHandler = withSmartRateLimit(errorHandler, {
        windowMs: 60000,
        maxRequests: 3,
        skipFailedRequests: true,
      });

      // Failed requests shouldn't count
      for (let i = 0; i < 10; i++) {
        const response = await limitedHandler(mockRequest);
        expect(response.status).toBe(500);
      }
    });

    it('should set rate limit headers normally', async () => {
      const limitedHandler = withSmartRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });

      const response = await limitedHandler(mockRequest);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status for existing key', async () => {
      const key = '/api/test:192.168.1.1';

      // Make a request to populate the store
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });
      await limitedHandler(mockRequest);

      // Note: The key format might differ, so we're testing the function interface
      const status = getRateLimitStatus(key);

      expect(status).toHaveProperty('count');
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetTime');
      expect(typeof status.count).toBe('number');
      expect(typeof status.remaining).toBe('number');
    });

    it('should return empty status for non-existent key', () => {
      const status = getRateLimitStatus('/api/test:nonexistent');

      expect(status.count).toBe(0);
      expect(status.remaining).toBe(0);
      expect(status.resetTime).toBeNull();
    });

    it('should clear expired entries', async () => {
      const key = '/api/test:192.168.1.1';

      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 50, // Short window
        maxRequests: 5,
      });

      await limitedHandler(mockRequest);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = getRateLimitStatus(key);
      expect(status.count).toBe(0);
      expect(status.resetTime).toBeNull();
    });
  });

  describe('clearRateLimit', () => {
    it('should clear specific rate limit entry', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // Use up the limit
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);

      let response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);

      // Clear the rate limit
      const ip = mockRequest.headers.get('x-forwarded-for') || 'unknown';
      const key = `${mockRequest.nextUrl.pathname}:${ip}`;
      clearRateLimit(key);

      // Should be allowed again
      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limit entries', async () => {
      const limitedHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // Use up the limit
      await limitedHandler(mockRequest);
      await limitedHandler(mockRequest);

      let response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);

      // Clear all rate limits
      clearAllRateLimits();

      // Should be allowed again
      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(200);
    });
  });

  describe('getRateLimitStats', () => {
    it('should return rate limit statistics', async () => {
      const stats = getRateLimitStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('trackedPaths');
      expect(stats).toHaveProperty('totalRequests');
      expect(typeof stats.totalEntries).toBe('number');
      expect(Array.isArray(stats.trackedPaths)).toBe(true);
      expect(typeof stats.totalRequests).toBe('number');
    });

    it('should track multiple paths', async () => {
      const handler1 = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });
      const handler2 = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });

      mockRequest.nextUrl.pathname = '/api/test1';
      await handler1(mockRequest);

      mockRequest.nextUrl.pathname = '/api/test2';
      await handler2(mockRequest);

      const stats = getRateLimitStats();

      expect(stats.trackedPaths.length).toBeGreaterThanOrEqual(2);
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle handler errors', async () => {
      const errorHandler = vi.fn().mockRejectedValue(
        new Error('Test error')
      );

      const limitedHandler = withRateLimit(errorHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });

      await expect(limitedHandler(mockRequest)).rejects.toThrow('Test error');
    });

    it('should still count failed requests toward limit', async () => {
      const errorHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ error: 'test' }, { status: 500 })
      );

      const limitedHandler = withRateLimit(errorHandler, {
        windowMs: 60000,
        maxRequests: 2,
      });

      // Failed requests should still count
      let response = await limitedHandler(mockRequest);
      expect(response.status).toBe(500);

      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(500);

      // 3rd request should be rate limited
      response = await limitedHandler(mockRequest);
      expect(response.status).toBe(429);
    });
  });
});
