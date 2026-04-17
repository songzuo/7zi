/**
 * Tests for cache-strategy module
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheStrategyManager, getCacheManager, CacheStrategy } from '../cache-strategy';

// Mock cache API
const mockCache = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
};

const mockCaches = {
  open: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(true),
};

vi.stubGlobal('caches', mockCaches);

describe('CacheStrategyManager', () => {
  let manager: CacheStrategyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global fetch mock
    globalThis.fetch = vi.fn();
    // Re-setup open to return mockCache for each test
    mockCaches.open.mockResolvedValue(mockCache);
    mockCache.match.mockResolvedValue(undefined);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.delete.mockResolvedValue(undefined);
    mockCache.keys.mockResolvedValue([]);
    manager = new CacheStrategyManager();
  });

  describe('initializeDefaultConfigs', () => {
    it('initializes default cache configurations', () => {
      expect(manager.getConfig('/static/')).toBeDefined();
      expect(manager.getConfig('/images/')).toBeDefined();
      expect(manager.getConfig('/api/')).toBeDefined();
      expect(manager.getConfig('/')).toBeDefined();
    });

    it('returns correct config for static assets', () => {
      const config = manager.getConfig('/static/test.js');
      expect(config.strategy).toBe('cache-first');
      expect(config.maxAge).toBe(86400);
    });

    it('returns correct config for images', () => {
      const config = manager.getConfig('/images/test.png');
      expect(config.strategy).toBe('cache-first');
      expect(config.maxAge).toBe(604800);
    });

    it('returns correct config for API calls', () => {
      const config = manager.getConfig('/api/test');
      expect(config.strategy).toBe('network-first');
      expect(config.maxAge).toBe(300);
    });

    it('returns default config for unknown URLs', () => {
      // /unknown/path matches '/' pattern which is stale-while-revalidate
      const config = manager.getConfig('/unknown/path');
      expect(config.strategy).toBe('stale-while-revalidate');
      expect(config.maxAge).toBe(600);
    });
  });

  describe('cacheFirst', () => {
    it('returns cached response if available and not expired', async () => {
      const cachedResponse = new Response('cached data', {
        headers: { 'sw-cached-at': Date.now().toString() },
      });
      mockCache.match.mockResolvedValue(cachedResponse);

      const request = new Request('https://example.com/static/test.js');
      const config = manager.getConfig('/static/test.js');

      const response = await manager.cacheFirst(request, config);

      expect(response).toBe(cachedResponse);
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('fetches from network if cache miss', async () => {
      mockCache.match.mockResolvedValue(undefined);
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/static/test.js');
      const config = manager.getConfig('/static/test.js');

      const response = await manager.cacheFirst(request, config);

      expect(response).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('returns null when cache returns null and network fails with null value', async () => {
      mockCache.match.mockResolvedValue(undefined);
      global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));

      const request = new Request('https://example.com/static/test.js');
      const config = manager.getConfig('/static/test.js');

      const response = await manager.cacheFirst(request, config);

      // Should still return the network response even if status is not ok
      expect(response.status).toBe(500);
    });
  });

  describe('networkFirst', () => {
    it('fetches from network first', async () => {
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/api/test');
      const config = manager.getConfig('/api/test');

      const response = await manager.networkFirst(request, config);

      expect(response).toBe(networkResponse);
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('falls back to cache on network failure', async () => {
      const cachedResponse = new Response('cached data', { status: 200 });
      mockCache.match.mockResolvedValue(cachedResponse);
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new Request('https://example.com/api/test');
      const config = manager.getConfig('/api/test');

      const response = await manager.networkFirst(request, config);

      expect(response).toBe(cachedResponse);
    });

    it('throws if both network and cache fail', async () => {
      mockCache.match.mockResolvedValue(undefined);
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new Request('https://example.com/api/test');
      const config = manager.getConfig('/api/test');

      await expect(manager.networkFirst(request, config)).rejects.toThrow();
    });

    it('returns non-ok network response when cache miss', async () => {
      mockCache.match.mockResolvedValue(undefined);
      global.fetch = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));

      const request = new Request('https://example.com/api/test');
      const config = manager.getConfig('/api/test');

      const response = await manager.networkFirst(request, config);
      expect(response.status).toBe(500);
    });
  });

  describe('staleWhileRevalidate', () => {
    it('returns cached response immediately', async () => {
      const cachedResponse = new Response('cached data', { status: 200 });
      mockCache.match.mockResolvedValue(cachedResponse);
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      const response = await manager.staleWhileRevalidate(request, config);

      expect(response).toBe(cachedResponse);
    });

    it('updates cache in background', async () => {
      const cachedResponse = new Response('cached data', { status: 200 });
      mockCache.match.mockResolvedValue(cachedResponse);
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      await manager.staleWhileRevalidate(request, config);

      // Wait a bit for background update
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCache.put).toHaveBeenCalled();
    });

    it('fetches from network on cache miss', async () => {
      mockCache.match.mockResolvedValue(undefined);
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      const response = await manager.staleWhileRevalidate(request, config);

      expect(response).toBe(networkResponse);
    });

    it('handles null cached response without throwing', async () => {
      mockCache.match.mockResolvedValue(null);
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      const response = await manager.staleWhileRevalidate(request, config);

      expect(response).toBe(networkResponse);
    });
  });

  describe('cacheOnly', () => {
    it('returns cached response if available', async () => {
      const cachedResponse = new Response('cached data', { status: 200 });
      mockCache.match.mockResolvedValue(cachedResponse);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      const response = await manager.cacheOnly(request, config);

      expect(response).toBe(cachedResponse);
    });

    it('throws error when no cache available', async () => {
      mockCache.match.mockResolvedValue(undefined);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      await expect(manager.cacheOnly(request, config)).rejects.toThrow('No cached response available');
    });

    it('handles null cache response as cache miss', async () => {
      mockCache.match.mockResolvedValue(null);

      const request = new Request('https://example.com/test');
      const config = manager.getConfig('/test');

      await expect(manager.cacheOnly(request, config)).rejects.toThrow('No cached response available');
    });
  });

  describe('networkOnly', () => {
    it('fetches from network without caching', async () => {
      const networkResponse = new Response('network data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/test');

      const response = await manager.networkOnly(request);

      expect(response).toBe(networkResponse);
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('throws error on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const request = new Request('https://example.com/test');

      await expect(manager.networkOnly(request)).rejects.toThrow('Network error');
    });
  });

  describe('clearAllCaches', () => {
    it('clears all 7zi caches', async () => {
      mockCaches.keys.mockResolvedValue([
        '7zi-static-v1',
        '7zi-dynamic-v1',
        'other-cache',
      ]);

      await manager.clearAllCaches();

      expect(mockCaches.delete).toHaveBeenCalledWith('7zi-static-v1');
      expect(mockCaches.delete).toHaveBeenCalledWith('7zi-dynamic-v1');
      expect(mockCaches.delete).not.toHaveBeenCalledWith('other-cache');
    });

    it('handles empty cache list gracefully', async () => {
      mockCaches.keys.mockResolvedValue([]);

      await manager.clearAllCaches();

      expect(mockCaches.delete).not.toHaveBeenCalled();
    });
  });

  describe('preloadAssets', () => {
    it('preloads multiple assets into cache', async () => {
      const urls = ['/static/1.js', '/static/2.js'];
      const networkResponse = new Response('data', { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(networkResponse);

      await manager.preloadAssets(urls, 'test-cache');

      expect(mockCaches.open).toHaveBeenCalledWith('test-cache');
      expect(global.fetch).toHaveBeenCalledTimes(urls.length);
      expect(mockCache.put).toHaveBeenCalledTimes(urls.length);
    });

    it('handles preload with empty url list', async () => {
      await manager.preloadAssets([], 'test-cache');

      expect(mockCaches.open).toHaveBeenCalledWith('test-cache');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles preload when network fails for some assets', async () => {
      const urls = ['/static/1.js', '/static/2.js'];
      const successResponse = new Response('data', { status: 200 });
      const failResponse = new Response('error', { status: 500 });
      global.fetch = vi.fn()
        .mockResolvedValueOnce(successResponse)
        .mockResolvedValueOnce(failResponse);

      await manager.preloadAssets(urls, 'test-cache');

      expect(mockCaches.open).toHaveBeenCalledWith('test-cache');
      // Only successful responses are cached
      expect(mockCache.put).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleRequest', () => {
    it('routes to cache-first for static assets', async () => {
      // For cache-first, we need a valid cached response that is not expired
      const now = Date.now();
      const cachedResponse = new Response('cached data', {
        headers: { 'sw-cached-at': now.toString() },
      });
      mockCache.match.mockResolvedValue(cachedResponse);

      const request = new Request('https://example.com/static/test.js');
      const response = await manager.handleRequest(request);

      expect(response).toBe(cachedResponse);
    });

    it('routes to network-first for API calls', async () => {
      const networkResponse = new Response('network data', { status: 200 });
      globalThis.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/api/test');
      const response = await manager.handleRequest(request);

      expect(response).toBe(networkResponse);
    });

    it('routes to stale-while-revalidate for root path', async () => {
      const networkResponse = new Response('network data', { status: 200 });
      globalThis.fetch = vi.fn().mockResolvedValue(networkResponse);

      const request = new Request('https://example.com/');
      const response = await manager.handleRequest(request);

      expect(response).toBe(networkResponse);
    });
  });
});

describe('getCacheManager', () => {
  it('returns singleton instance', () => {
    const manager1 = getCacheManager();
    const manager2 = getCacheManager();

    expect(manager1).toBe(manager2);
  });
});
