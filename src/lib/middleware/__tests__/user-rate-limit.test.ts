/**
 * User-Based Rate Limiting Middleware Tests
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock logger first
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock jose module before importing the functions being tested
const { mockJwtVerify } = vi.hoisted(() => ({
  mockJwtVerify: vi.fn(),
}));
vi.mock('jose', () => ({
  jwtVerify: mockJwtVerify,
}));

// Now import the functions being tested
import {
  getUserIdFromToken,
  getUserIdFromApiKey,
  getUserIdentifier,
  getUserRateLimitConfig,
  checkUserRateLimit,
  getUserRateLimitStatus,
  clearUserRateLimit,
  clearAllUserRateLimits,
  getUserRateLimitStats,
  cleanupUserRateLimits,
} from '@/lib/middleware/user-rate-limit';

describe('User-Based Rate Limiting', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllUserRateLimits();
    mockJwtVerify.mockReset();

    mockRequest = {
      nextUrl: {
        pathname: '/api/test',
        origin: 'http://localhost:3000',
      },
      headers: new Headers(),
      method: 'GET',
    } as unknown as NextRequest;
  });

  describe('getUserIdFromToken', () => {
    it('should extract userId from valid JWT token with userId', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = { userId: 'user123', role: 'admin' };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await getUserIdFromToken(mockToken);

      expect(result).toEqual({ userId: 'user123', role: 'admin' });
      expect(mockJwtVerify).toHaveBeenCalledWith(
        mockToken,
        expect.any(Uint8Array)
      );
    });

    it('should extract userId from sub claim', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = { sub: 'user456' };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await getUserIdFromToken(mockToken);

      expect(result).toEqual({ userId: 'user456', role: '' });
    });

    it('should return null for invalid token', async () => {
      const mockToken = 'invalid.jwt.token';

      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await getUserIdFromToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null when no user identifier in payload', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = { some: 'data', without: 'userId' };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await getUserIdFromToken(mockToken);

      expect(result).toBeNull();
    });

    it('should extract role from nested user object', async () => {
      const mockToken = 'valid.jwt.token';
      const mockPayload = { userId: 'user789', user: { role: 'moderator' } };

      mockJwtVerify.mockResolvedValue({ payload: mockPayload });

      const result = await getUserIdFromToken(mockToken);

      expect(result).toEqual({ userId: 'user789', role: 'moderator' });
    });
  });

  describe('getUserIdFromApiKey', () => {
    it('should extract user ID from Authorization header', () => {
      mockRequest.headers.set('authorization', 'Bearer sk_agent_abc123def456');

      const result = getUserIdFromApiKey(mockRequest);

      expect(result).toBe('abc123def456');
    });

    it('should return null for non-API key tokens', () => {
      mockRequest.headers.set('authorization', 'Bearer regular.jwt.token');

      const result = getUserIdFromApiKey(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when no Authorization header', () => {
      const result = getUserIdFromApiKey(mockRequest);

      expect(result).toBeNull();
    });

    it('should extract from X-API-Key header', () => {
      mockRequest.headers.set('x-api-key', 'sk_agent_xyz789');

      const result = getUserIdFromApiKey(mockRequest);

      expect(result).toBe('xyz789');
    });
  });

  describe('getUserIdentifier', () => {
    it('should extract from JWT token', async () => {
      mockRequest.headers.set('authorization', 'Bearer regular.jwt.token');
      mockJwtVerify.mockResolvedValue({
        payload: { userId: 'user123', role: 'admin' },
      });

      const result = await getUserIdentifier(mockRequest);

      expect(result).toEqual({
        userId: 'user123',
        role: 'admin',
        source: 'jwt',
      });
    });

    it('should extract from API key', async () => {
      mockRequest.headers.set('authorization', 'Bearer sk_agent_abc123');

      const result = await getUserIdentifier(mockRequest);

      expect(result).toEqual({
        userId: 'abc123',
        source: 'apikey',
      });
    });

    it('should return null when no identifier', async () => {
      const result = await getUserIdentifier(mockRequest);

      expect(result).toEqual({
        userId: null,
        source: 'none',
      });
    });

    it('should prioritize API key over JWT', async () => {
      mockRequest.headers.set('authorization', 'Bearer sk_agent_api123');

      const result = await getUserIdentifier(mockRequest);

      expect(result).toEqual({
        userId: 'api123',
        source: 'apikey',
      });
      // JWT verify should not be called
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });
  });

  describe('getUserRateLimitConfig', () => {
    it('should return admin config for admin role', () => {
      const config = getUserRateLimitConfig('admin');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 1000,
        role: 'admin',
      });
    });

    it('should return user config for user role', () => {
      const config = getUserRateLimitConfig('user');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 60,
        role: 'user',
      });
    });

    it('should return default config for unknown role', () => {
      const config = getUserRateLimitConfig('unknown');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 60,
        role: 'user',
      });
    });

    it('should return default config when no role', () => {
      const config = getUserRateLimitConfig();

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 60,
        role: 'user',
      });
    });

    it('should return moderator config', () => {
      const config = getUserRateLimitConfig('moderator');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 500,
        role: 'moderator',
      });
    });

    it('should return guest config', () => {
      const config = getUserRateLimitConfig('guest');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 30,
        role: 'guest',
      });
    });

    it('should return agent config', () => {
      const config = getUserRateLimitConfig('agent');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 200,
        role: 'agent',
      });
    });

    it('should return worker config', () => {
      const config = getUserRateLimitConfig('worker');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 100,
        role: 'worker',
      });
    });

    it('should return executor config', () => {
      const config = getUserRateLimitConfig('executor');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 80,
        role: 'executor',
      });
    });
  });

  describe('checkUserRateLimit', () => {
    it('should allow first request', () => {
      const result = checkUserRateLimit('user123', 'user');

      expect(result).toEqual({
        allowed: true,
        remaining: 59,
        resetTime: expect.any(Number),
        limit: 60,
      });
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 50; i++) {
        const result = checkUserRateLimit('user123', 'user');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', () => {
      const maxRequests = 60;

      // Exhaust the limit
      for (let i = 0; i < maxRequests; i++) {
        const result = checkUserRateLimit('user123', 'user');
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = checkUserRateLimit('user123', 'user');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use custom config when provided', () => {
      const result = checkUserRateLimit('user123', 'user', {
        maxRequests: 10,
      });

      expect(result.limit).toBe(10);
    });

    it('should handle different users separately', () => {
      // User 1 uses up their limit
      for (let i = 0; i < 60; i++) {
        checkUserRateLimit('user1', 'user');
      }

      const result1 = checkUserRateLimit('user1', 'user');
      expect(result1.allowed).toBe(false);

      // User 2 should still be allowed
      const result2 = checkUserRateLimit('user2', 'user');
      expect(result2.allowed).toBe(true);
    });

    it('should respect role-based limits', () => {
      // Admin with higher limit
      for (let i = 0; i < 100; i++) {
        const result = checkUserRateLimit('admin1', 'admin');
        expect(result.allowed).toBe(true);
      }

      // User with lower limit
      const result = checkUserRateLimit('user1', 'user');
      expect(result.limit).toBe(60);
    });

    it('should reset after window expires', () => {
      // Use custom config with short window for testing
      const result = checkUserRateLimit('user123', 'user', {
        windowMs: 100,
        maxRequests: 5,
      });

      expect(result.allowed).toBe(true);

      // Wait for window to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          const resultAfterReset = checkUserRateLimit('user123', 'user', {
            windowMs: 100,
            maxRequests: 5,
          });

          expect(resultAfterReset.allowed).toBe(true);
          resolve(null);
        }, 150);
      });
    });
  });

  describe('getUserRateLimitStatus', () => {
    it('should return status for active user', () => {
      checkUserRateLimit('user123', 'user');

      const status = getUserRateLimitStatus('user123');

      expect(status).not.toBeNull();
      expect(status?.count).toBe(1);
      expect(status?.remaining).toBe(59);
      expect(status?.role).toBe('user');
      expect(status?.resetTime).toBeGreaterThan(0);
    });

    it('should return null for non-existent user', () => {
      const status = getUserRateLimitStatus('nonexistent');

      expect(status).toBeNull();
    });
  });

  describe('clearUserRateLimit', () => {
    it('should clear rate limit for specific user', () => {
      // Use up the limit
      for (let i = 0; i < 60; i++) {
        checkUserRateLimit('user123', 'user');
      }

      let result = checkUserRateLimit('user123', 'user');
      expect(result.allowed).toBe(false);

      // Clear the rate limit
      clearUserRateLimit('user123');

      // Should be allowed again
      result = checkUserRateLimit('user123', 'user');
      expect(result.allowed).toBe(true);
    });
  });

  describe('clearAllUserRateLimits', () => {
    it('should clear all user rate limits', () => {
      // Add multiple users
      for (let i = 0; i < 5; i++) {
        checkUserRateLimit(`user${i}`, 'user');
      }

      clearAllUserRateLimits();

      // All should be reset
      for (let i = 0; i < 5; i++) {
        const status = getUserRateLimitStatus(`user${i}`);
        expect(status).toBeNull();
      }
    });
  });

  describe('getUserRateLimitStats', () => {
    it('should return empty stats initially', () => {
      const stats = getUserRateLimitStats();

      expect(stats).toEqual({
        totalUsers: 0,
        totalRequests: 0,
        roleBreakdown: {},
      });
    });

    it('should track multiple users', () => {
      checkUserRateLimit('user1', 'user');
      checkUserRateLimit('user2', 'user');
      checkUserRateLimit('admin1', 'admin');

      const stats = getUserRateLimitStats();

      expect(stats.totalUsers).toBe(3);
      expect(stats.totalRequests).toBe(3);
      expect(stats.roleBreakdown).toHaveProperty('user');
      expect(stats.roleBreakdown).toHaveProperty('admin');
    });

    it('should count requests per user', () => {
      for (let i = 0; i < 10; i++) {
        checkUserRateLimit('user1', 'user');
      }

      for (let i = 0; i < 5; i++) {
        checkUserRateLimit('user2', 'user');
      }

      const stats = getUserRateLimitStats();

      expect(stats.totalRequests).toBe(15);
      expect(stats.roleBreakdown.user?.requests).toBe(15);
    });

    it('should handle unknown roles', () => {
      checkUserRateLimit('user1', undefined);

      const stats = getUserRateLimitStats();

      expect(stats.roleBreakdown).toHaveProperty('unknown');
    });
  });

  describe('cleanupUserRateLimits', () => {
    it('should not clean up active entries', () => {
      checkUserRateLimit('user1', 'user', {
        windowMs: 5000,
        maxRequests: 5,
      });

      cleanupUserRateLimits();

      const status = getUserRateLimitStatus('user1');
      expect(status).not.toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex user scenarios', () => {
      // Admin with high limit
      for (let i = 0; i < 100; i++) {
        const result = checkUserRateLimit('admin1', 'admin');
        expect(result.allowed).toBe(true);
      }

      // Regular user with normal limit
      for (let i = 0; i < 60; i++) {
        const result = checkUserRateLimit('user1', 'user');
        expect(result.allowed).toBe(true);
      }

      // User limit exceeded
      const result = checkUserRateLimit('user1', 'user');
      expect(result.allowed).toBe(false);

      // Different user still allowed
      const result2 = checkUserRateLimit('user2', 'user');
      expect(result2.allowed).toBe(true);

      // Verify stats
      const stats = getUserRateLimitStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.roleBreakdown.admin?.count).toBe(1);
      expect(stats.roleBreakdown.user?.count).toBeGreaterThan(0);
    });
  });
});
