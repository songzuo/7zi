/**
 * API 缓存测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCache,
  setCache,
  clearCache,
  getCacheStats,
  createCacheMiddleware,
} from './cache';
import { NextRequest, NextResponse } from 'next/server';

describe('Cache Store', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should set and get cache', () => {
    const key = 'test-key';
    const data = { message: 'Hello' };

    setCache(key, data);
    const cached = getCache(key);

    expect(cached).not.toBeNull();
    expect(cached?.data).toEqual(data);
    expect(cached?.etag).toBeDefined();
  });

  it('should return null for missing cache', () => {
    const cached = getCache('non-existent');
    expect(cached).toBeNull();
  });

  it('should clear all cache', () => {
    setCache('key1', { a: 1 });
    setCache('key2', { b: 2 });

    expect(getCacheStats().size).toBe(2);

    clearCache();

    expect(getCacheStats().size).toBe(0);
  });

  it('should clear cache by pattern', () => {
    setCache('api/users/1', { id: 1 });
    setCache('api/users/2', { id: 2 });
    setCache('api/tasks/1', { id: 1 });

    clearCache('users');

    expect(getCache('api/users/1')).toBeNull();
    expect(getCache('api/users/2')).toBeNull();
    expect(getCache('api/tasks/1')).not.toBeNull();
  });

  it('should generate consistent ETags', () => {
    const data = { test: 'data' };

    setCache('key1', data);
    setCache('key2', data);

    const cache1 = getCache('key1');
    const cache2 = getCache('key2');

    // 相同数据应该生成相同的 ETag
    expect(cache1?.etag).toBe(cache2?.etag);
  });
});

describe('Cache Middleware', () => {
  function createMockRequest(url = 'http://localhost/api/test'): NextRequest {
    return {
      url,
      method: 'GET',
      headers: {
        get: () => null,
      },
      nextUrl: new URL(url),
    } as unknown as NextRequest;
  }

  beforeEach(() => {
    clearCache();
  });

  it('should cache GET responses', async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ data: 'test' })
    );

    const cachedHandler = createCacheMiddleware({ ttl: 60 })(handler);
    const request = createMockRequest();

    // 第一次请求
    const response1 = await cachedHandler(request);
    expect(response1.headers.get('X-Cache')).toBe('MISS');
    expect(handler).toHaveBeenCalledTimes(1);

    // 第二次请求应该命中缓存
    const response2 = await cachedHandler(request);
    expect(response2.headers.get('X-Cache')).toBe('HIT');
    expect(handler).toHaveBeenCalledTimes(1); // 没有增加
  });

  it('should return 304 for matching ETag', async () => {
    const data = { data: 'test' };
    const handler = vi.fn().mockResolvedValue(NextResponse.json(data));

    const cachedHandler = createCacheMiddleware({ ttl: 60 })(handler);
    const request = createMockRequest();

    // 第一次请求建立缓存
    await cachedHandler(request);
    const cached = getCache(request.url);

    // 带 If-None-Match 的请求
    const requestWithETag = {
      ...createMockRequest(),
      headers: {
        get: (key: string) => (key === 'if-none-match' ? cached?.etag ?? null : null),
      },
    } as unknown as NextRequest;

    const response = await cachedHandler(requestWithETag);
    expect(response.status).toBe(304);
  });

  it('should not cache non-GET requests', async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    );

    const cachedHandler = createCacheMiddleware({ ttl: 60 })(handler);

    const postRequest = {
      ...createMockRequest(),
      method: 'POST',
    } as unknown as NextRequest;

    const response = await cachedHandler(postRequest);
    expect(response.headers.get('X-Cache')).toBe('BYPASS');
  });

  it('should not cache error responses', async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ error: 'failed' }, { status: 500 })
    );

    const cachedHandler = createCacheMiddleware({ ttl: 60 })(handler);
    const request = createMockRequest();

    await cachedHandler(request);

    // 失败响应不应该被缓存
    expect(getCache(request.url)).toBeNull();
  });
});