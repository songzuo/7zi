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
  open: vi.fn().mockResolvedValue(mockCache),
  keys: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(true),
};

vi.stubGlobal('caches', mockCaches);

describe('CacheStrategyManager', () => {
  let manager: CacheStrategyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CacheStrategyManager();
  });

  afterEach(() => {
    vi.resetAllMocks();
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
      const config = manager.getConfig('/unknown/path');
      expect(config.strategy).toBe('network-first');
      expect(config.maxAge).toBe(300);
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
  });
});

describe('getCacheManager', () => {
  it('returns singleton instance', () => {
    const manager1 = getCacheManager();
    const manager2 = getCacheManager();

    expect(manager1).toBe(manager2);
  });
});
