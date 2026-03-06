/**
 * API 限流测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRateLimiter, withRateLimit, rateLimitPresets, clearRateLimitStore } from './rate-limit';
import { NextRequest, NextResponse } from 'next/server';

// Mock NextRequest
function createMockRequest(ip = '127.0.0.1'): NextRequest {
  return {
    headers: {
      get: (key: string) => {
        if (key === 'x-forwarded-for') return ip;
        return null;
      },
    },
    nextUrl: new URL('http://localhost/api/test'),
  } as unknown as NextRequest;
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 5,
    });

    const request = createMockRequest();

    for (let i = 0; i < 5; i++) {
      const result = await limiter(request);
      expect(result).toBeNull(); // null 表示通过
    }
  });

  it('should block requests exceeding limit', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 3,
    });

    const request = createMockRequest();

    // 前3次应该通过
    for (let i = 0; i < 3; i++) {
      const result = await limiter(request);
      expect(result).toBeNull();
    }

    // 第4次应该被阻止
    const result = await limiter(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it('should reset after window expires', async () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      maxRequests: 2,
    });

    const request = createMockRequest();

    // 使用配额
    await limiter(request);
    await limiter(request);

    // 超出限制
    let result = await limiter(request);
    expect(result?.status).toBe(429);

    // 等待窗口过期
    vi.advanceTimersByTime(1100);

    // 应该可以再次请求
    result = await limiter(request);
    expect(result).toBeNull();
  });

  it('should track different IPs separately', async () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
    });

    const request1 = createMockRequest('192.168.1.1');
    const request2 = createMockRequest('192.168.1.2');

    // 每个IP应该有独立的配额
    await limiter(request1);
    await limiter(request1);

    let result = await limiter(request1);
    expect(result?.status).toBe(429);

    // 不同IP不受影响
    result = await limiter(request2);
    expect(result).toBeNull();
  });
});

describe('withRateLimit', () => {
  it('should wrap handler with rate limiting', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit(handler, 'strict');

    const request = createMockRequest();

    // 应该在限制内通过
    const result = await wrapped(request);
    expect(result.status).toBe(200);
  });

  it('should use preset configurations', () => {
    expect(rateLimitPresets.strict.maxRequests).toBe(10);
    expect(rateLimitPresets.standard.maxRequests).toBe(60);
    expect(rateLimitPresets.auth.maxRequests).toBe(5);
  });
});
