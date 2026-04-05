/**
 * Service Worker for Mobile Optimization
 * Implements advanced caching strategies and offline support
 */

import { getCacheManager } from './cache-strategy';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1.13.0';
const CACHE_PREFIX = '7zi-';

// Cache names
const CACHE_NAMES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  dynamic: `${CACHE_PREFIX}dynamic-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}images-${CACHE_VERSION}`,
};

// Critical assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install event - pre-cache critical assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.static);

      // Pre-cache critical assets
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (error) {
        console.error('Precache failed:', error);
      }

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Get all cache names
      const cacheNames = await caches.keys();

      // Delete old caches
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith(CACHE_PREFIX) && !Object.values(CACHE_NAMES).includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );

      // Claim all clients
      self.clients.claim();
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !url.hostname.includes('7zi.com')) {
    return;
  }

  event.respondWith(handleRequest(request, url));
});

/**
 * Handle fetch request with appropriate caching strategy
 */
async function handleRequest(request: Request, url: URL): Promise<Response> {
  const cacheManager = getCacheManager();
  const config = cacheManager.getConfig(url.pathname);

  try {
    switch (config.strategy) {
      case 'cache-first':
        return await cacheFirst(request, config);
      case 'network-first':
        return await networkFirst(request, config);
      case 'stale-while-revalidate':
        return await staleWhileRevalidate(request, config);
      case 'cache-only':
        return await cacheOnly(request, config);
      case 'network-only':
      default:
        return await fetch(request);
    }
  } catch (error) {
    console.error('Fetch failed:', error);

    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return await getOfflineFallback();
    }

    throw error;
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request: Request, config: any): Promise<Response> {
  const cache = await caches.open(config.cacheName);
  const cachedResponse = await cache.match(request, config.matchOptions);

  if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
    return cachedResponse;
  }

  // Cache miss or expired, fetch from network
  return await networkFirst(request, config);
}

/**
 * Network-first strategy
 */
async function networkFirst(request: Request, config: any): Promise<Response> {
  const cache = await caches.open(config.cacheName);

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
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
        await cleanCache(cache, config.cacheName, config.maxEntries);
      }

      await cache.put(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request, config.matchOptions);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request: Request, config: any): Promise<Response> {
  const cache = await caches.open(config.cacheName);
  const cachedResponse = await cache.match(request, config.matchOptions);

  // Cache hit - return immediately and update in background
  if (cachedResponse) {
    // Revalidate in background
    const fetchPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        const responseToCache = new Response(networkResponse.clone().body, {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: {
            ...Object.fromEntries(networkResponse.headers.entries()),
            'sw-cached-at': Date.now().toString(),
          },
        });

        if (config.maxEntries) {
          await cleanCache(cache, config.cacheName, config.maxEntries);
        }

        await cache.put(request, responseToCache);
      }
    });

    // Don't wait for background update
    fetchPromise.catch(() => {});

    return cachedResponse;
  }

  // Cache miss - fetch from network
  return await networkFirst(request, config);
}

/**
 * Cache-only strategy
 */
async function cacheOnly(request: Request, config: any): Promise<Response> {
  const cache = await caches.open(config.cacheName);
  const cachedResponse = await cache.match(request, config.matchOptions);

  if (cachedResponse) {
    return cachedResponse;
  }

  throw new Error('No cached response available');
}

/**
 * Check if cached response is expired
 */
function isExpired(response: Response, maxAge?: number): boolean {
  if (!maxAge) return false;

  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true;

  const age = (Date.now() - parseInt(cachedAt)) / 1000;
  return age > maxAge;
}

/**
 * Clean old cache entries
 */
async function cleanCache(cache: Cache, cacheName: string, maxEntries: number): Promise<void> {
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    // Sort by cache date if available
    const toDelete = keys.slice(maxEntries);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

/**
 * Get offline fallback page
 */
async function getOfflineFallback(): Promise<Response> {
  const cache = await caches.open(CACHE_NAMES.static);
  const offlineResponse = await cache.match('/offline.html');

  if (offlineResponse) {
    return offlineResponse;
  }

  // Return default offline response
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Offline - 7zi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .offline-container {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          .offline-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            color: #333;
          }
          p {
            margin: 0 0 20px 0;
            color: #666;
          }
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📱</div>
          <h1>You're Offline</h1>
          <p>Check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
    </html>
    `,
    {
      headers: { 'Content-Type': 'text/html' },
    }
  );
}

/**
 * Message event - handle communication from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      cacheUrls(payload.urls, payload.cacheName);
      break;

    case 'CLEAR_CACHE':
      clearCache(payload.cacheName);
      break;

    case 'GET_STATS':
      getStats(event.ports[0]);
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

/**
 * Cache specific URLs
 */
async function cacheUrls(urls: string[], cacheName: string) {
  const cache = await caches.open(cacheName || CACHE_NAMES.dynamic);
  await cache.addAll(urls);
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName?: string) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX))
        .map((name) => caches.delete(name))
    );
  }
}

/**
 * Get cache statistics
 */
async function getStats(port: MessagePort) {
  const stats: Record<string, number> = {};

  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    if (name.startsWith(CACHE_PREFIX)) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats[name] = keys.length;
    }
  }

  port.postMessage({ type: 'STATS', payload: stats });
}

export {};
