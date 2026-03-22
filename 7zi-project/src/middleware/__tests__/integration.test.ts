/**
 * Middleware Integration Tests
 *
 * Tests for verifying that CORS, CSRF, and Rate Limiting middleware
 * work correctly together.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { withCors, withRateLimit, withCsrfProtection, withStandardApiSecurity } from '../index';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Mock logger to avoid console output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Middleware Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withCors', () => {
    it('should allow requests from allowed origins', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const corsHandler = withCors(mockHandler, {
        origin: ['http://localhost:3000'],
      });

      const response = await corsHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('should block requests from unauthorized origins', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          origin: 'http://malicious.com',
        },
      });

      const corsHandler = withCors(mockHandler, {
        origin: ['http://localhost:3000'],
      });

      const response = await corsHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });

    it('should handle preflight OPTIONS requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
        },
      });

      const corsHandler = withCors(mockHandler, {
        origin: ['http://localhost:3000'],
      });

      const response = await corsHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  describe('withRateLimit', () => {
    it('should allow requests within limit', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const rateLimitHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 10,
      });

      const response = await rateLimitHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    });

    it('should block requests exceeding limit', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const rateLimitHandler = withRateLimit(mockHandler, {
        windowMs: 60000,
        maxRequests: 1,
      });

      // First request should succeed
      const firstResponse = await rateLimitHandler(request);
      expect(firstResponse.status).toBe(200);

      // Second request should be rate limited
      const secondResponse = await rateLimitHandler(request);
      expect(secondResponse.status).toBe(429);
      expect(secondResponse.headers.get('Retry-After')).toBeTruthy();
    });
  });

  describe('withCsrfProtection', () => {
    it('should skip validation for GET requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const csrfHandler = withCsrfProtection(mockHandler);

      const response = await csrfHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should validate CSRF tokens for POST requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const csrfToken = 'test-token';
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: csrfToken }),
      };

      vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });

      const csrfHandler = withCsrfProtection(mockHandler, {
        useSignedTokens: false, // Disable signature for this test
      });

      const response = await csrfHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get('X-CSRF-Validated')).toBe('true');
    });

    it('should block requests without CSRF tokens', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const mockCookieStore = {
        get: vi.fn().mockReturnValue(undefined),
      };

      vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      });

      const csrfHandler = withCsrfProtection(mockHandler);

      const response = await csrfHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('withStandardApiSecurity', () => {
    it('should apply all middleware in correct order', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const csrfToken = 'test-token';
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: csrfToken }),
        set: vi.fn(),
      };

      vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          'x-csrf-token': csrfToken,
        },
      });

      const securedHandler = withStandardApiSecurity(mockHandler, {
        cors: {
          origin: ['http://localhost:3000'],
        },
        rateLimit: {
          windowMs: 60000,
          maxRequests: 10,
        },
        csrf: {
          useSignedTokens: false,
          rotateTokens: false,
        },
      });

      const response = await securedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);

      // Check CORS headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');

      // Check rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();

      // Check CSRF headers
      expect(response.headers.get('X-CSRF-Validated')).toBe('true');
    });

    it('should block requests that fail CORS validation', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          origin: 'http://malicious.com',
        },
      });

      const securedHandler = withStandardApiSecurity(mockHandler, {
        cors: {
          origin: ['http://localhost:3000'],
        },
      });

      const response = await securedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('Middleware Configuration', () => {
    it('should allow custom CORS origins', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://example.com/api/test', {
        method: 'GET',
        headers: {
          origin: 'https://api.example.com',
        },
      });

      const corsHandler = withCors(mockHandler, {
        origin: ['https://api.example.com'],
      });

      const response = await corsHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://api.example.com');
    });

    it('should allow custom rate limit configurations', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      });

      const rateLimitHandler = withRateLimit(mockHandler, {
        windowMs: 30000, // 30 seconds
        maxRequests: 5, // 5 requests
      });

      const response = await rateLimitHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    });

    it('should allow CSRF exempt paths', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const request = new NextRequest('http://localhost:3000/api/public/webhook', {
        method: 'POST',
      });

      const csrfHandler = withCsrfProtection(mockHandler, {
        exemptPaths: ['/api/public/webhook'],
      });

      const response = await csrfHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });
});
