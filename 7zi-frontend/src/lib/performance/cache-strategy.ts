/**
 * Service Worker Cache Strategy
 * Implements multiple caching strategies for optimal performance
 */

export type CacheStrategy = 'stale-while-revalidate' | 'network-first' | 'cache-first' | 'network-only' | 'cache-only';

export interface CacheConfig {
  strategy: CacheStrategy;
  maxAge?: number; // in seconds
  maxEntries?: number;
  cacheName: string;
  matchOptions?: CacheQueryOptions;
}

export class CacheStrategyManager {
  private cacheNames = {
    static: '7zi-static-v1',
    dynamic: '7zi-dynamic-v1',
    api: '7zi-api-v1',
    images: '7zi-images-v1',
  };

  private config: Map<string, CacheConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Static assets - cache first, long max age
    this.config.set('/static/', {
      strategy: 'cache-first',
      maxAge: 86400, // 1 day
      maxEntries: 100,
      cacheName: this.cacheNames.static,
      matchOptions: { ignoreSearch: true },
    });

    // Images - cache first with longer max age
    this.config.set('/images/', {
      strategy: 'cache-first',
      maxAge: 604800, // 7 days
      maxEntries: 200,
      cacheName: this.cacheNames.images,
      matchOptions: { ignoreSearch: true },
    });

    // API calls - network first, cache for fallback
    this.config.set('/api/', {
      strategy: 'network-first',
      maxAge: 300, // 5 minutes
      maxEntries: 50,
      cacheName: this.cacheNames.api,
    });

    // Dynamic content - stale while revalidate
    this.config.set('/', {
      strategy: 'stale-while-revalidate',
      maxAge: 600, // 10 minutes
      maxEntries: 20,
      cacheName: this.cacheNames.dynamic,
    });
  }

  /**
   * Get cache configuration for a URL
   */
  getConfig(url: string): CacheConfig {
    for (const [pattern, config] of this.config) {
      if (url.startsWith(pattern)) {
        return config;
      }
    }

    // Default config for unknown URLs
    return {
      strategy: 'network-first',
      maxAge: 300,
      maxEntries: 30,
      cacheName: this.cacheNames.dynamic,
    };
  }

  /**
   * Stale-while-revalidate strategy
   * Returns cached response immediately, updates cache in background
   */
  async staleWhileRevalidate(
    request: Request,
    config: CacheConfig
  ): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request, config.matchOptions);

    // Cache hit - return immediately and update in background
    if (cachedResponse) {
      // Revalidate in background
      this.fetchAndCache(request, cache, config).catch(() => {
        // Silent failure
      });

      return cachedResponse;
    }

    // Cache miss - fetch from network
    return this.fetchAndCache(request, cache, config);
  }

  /**
   * Network-first strategy
   * Try network first, fall back to cache on failure
   */
  async networkFirst(
    request: Request,
    config: CacheConfig
  ): Promise<Response> {
    const cache = await caches.open(config.cacheName);

    try {
      const networkResponse = await this.fetchAndCache(request, cache, config);
      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      const cachedResponse = await cache.match(request, config.matchOptions);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Both failed, throw error
      throw new Error('Network request failed and no cache available');
    }
  }

  /**
   * Cache-first strategy
   * Try cache first, fall back to network on miss
   */
  async cacheFirst(
    request: Request,
    config: CacheConfig
  ): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request, config.matchOptions);

    if (cachedResponse && !this.isExpired(cachedResponse, config.maxAge)) {
      return cachedResponse;
    }

    // Cache miss or expired, fetch from network
    return this.fetchAndCache(request, cache, config);
  }

  /**
   * Network-only strategy
   * Always fetch from network, no caching
   */
  async networkOnly(request: Request): Promise<Response> {
    return fetch(request);
  }

  /**
   * Cache-only strategy
   * Only serve from cache, no network requests
   */
  async cacheOnly(
    request: Request,
    config: CacheConfig
  ): Promise<Response> {
    const cache = await caches.open(config.cacheName);
    const cachedResponse = await cache.match(request, config.matchOptions);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error('No cached response available');
  }

  /**
   * Fetch and cache response
   */
  private async fetchAndCache(
    request: Request,
    cache: Cache,
    config: CacheConfig
  ): Promise<Response> {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      // Add timestamp to response headers for expiration checking
      const responseToCache = new Response(networkResponse.clone().body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers.entries()),
          'sw-cached-at': Date.now().toString(),
        },
      });

      // Clean old entries if maxEntries is set
      if (config.maxEntries) {
        await this.cleanCache(cache, config.cacheName, config.maxEntries);
      }

      await cache.put(request, responseToCache);
    }

    return networkResponse;
  }

  /**
   * Check if cached response is expired
   */
  private isExpired(response: Response, maxAge?: number): boolean {
    if (!maxAge) return false;

    const cachedAt = response.headers.get('sw-cached-at');
    if (!cachedAt) return true;

    const age = (Date.now() - parseInt(cachedAt)) / 1000;
    return age > maxAge;
  }

  /**
   * Clean old cache entries
   */
  private async cleanCache(
    cache: Cache,
    cacheName: string,
    maxEntries: number
  ): Promise<void> {
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      // Sort by date (if available) or remove oldest entries
      const toDelete = keys.slice(maxEntries);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  }

  /**
   * Route request using appropriate strategy
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const config = this.getConfig(url.pathname);

    switch (config.strategy) {
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(request, config);
      case 'network-first':
        return this.networkFirst(request, config);
      case 'cache-first':
        return this.cacheFirst(request, config);
      case 'network-only':
        return this.networkOnly(request);
      case 'cache-only':
        return this.cacheOnly(request, config);
      default:
        return this.networkFirst(request, config);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.filter(name => name.startsWith('7zi-')).map(name => caches.delete(name))
    );
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName: string): Promise<void> {
    await caches.delete(cacheName);
  }

  /**
   * Preload critical assets
   */
  async preloadAssets(urls: string[], cacheName: string): Promise<void> {
    const cache = await caches.open(cacheName);
    await Promise.all(
      urls.map(url =>
        fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
        })
      )
    );
  }
}

// Singleton instance
let cacheManagerInstance: CacheStrategyManager | null = null;

export function getCacheManager(): CacheStrategyManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheStrategyManager();
  }
  return cacheManagerInstance;
}
