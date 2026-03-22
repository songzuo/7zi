/**
 * Advanced Service Worker for 7zi Studio PWA
 *
 * Caching Strategy:
 * - Static assets: Cache-First (images, fonts, icons)
 * - HTML pages: Network-First with offline fallback
 * - API calls: Network-Only (don't cache dynamic data)
 * - JS/CSS: Stale-While-Revalidate
 */

// Cache names with versioning for easy updates
const CACHE_PREFIX = '7zi-studio';
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

// Cache names for different resource types
const STATIC_CACHE = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

// Cache size limits (in KB)
const MAX_CACHE_SIZE = 50 * 1024; // 50MB per cache type
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Install event - pre-cache critical assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing Service Worker version:', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('[SW] Pre-caching critical assets');
        await cache.addAll(PRECACHE_ASSETS);

        // Force the waiting service worker to become the active service worker
        await self.skipWaiting();
        console.log('[SW] Service Worker installed successfully');
      } catch (error) {
        console.error('[SW] Pre-cache failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating Service Worker version:', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter((name) => {
        return (
          name.startsWith(CACHE_PREFIX) &&
          name !== STATIC_CACHE &&
          name !== DYNAMIC_CACHE &&
          name !== IMAGE_CACHE
        );
      });

      if (cachesToDelete.length > 0) {
        console.log('[SW] Deleting old caches:', cachesToDelete);
        await Promise.all(cachesToDelete.map((name) => caches.delete(name)));
      }

      // Take control of all clients immediately
      await self.clients.claim();
      console.log('[SW] Service Worker activated');
    })()
  );
});

// Fetch event - intelligent caching based on request type
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API calls (let them go to network only)
  if (request.url.includes('/api/')) {
    return;
  }

  // Skip non-GET requests for non-GET methods
  if (request.url.includes('/_next/')) {
    // For Next.js static assets, use cache-first
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle different types of requests
  const url = new URL(request.url);

  // Images - Cache-First
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Fonts - Cache-First
  if (request.url.includes('fonts.gstatic.com') || request.url.includes('fonts.googleapis.com')) {
    event.respondWith(handleFontRequest(request));
    return;
  }

  // HTML pages - Network-First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Everything else - Stale-While-Revalidate
  event.respondWith(handleStaleWhileRevalidate(request));
});

/**
 * Handle static assets (Cache-First)
 */
async function handleStaticAsset(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    throw error;
  }
}

/**
 * Handle images (Cache-First with cleanup)
 */
async function handleImageRequest(request: Request): Promise<Response> {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clean up old images before caching new one
      await cleanCache(IMAGE_CACHE, MAX_CACHE_SIZE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    // Return a placeholder image if available
    return new Response('Image not available offline', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

/**
 * Handle fonts (Cache-First)
 */
async function handleFontRequest(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Font fetch failed:', error);
    throw error;
  }
}

/**
 * Handle navigation (Network-First with offline fallback)
 */
async function handleNavigationRequest(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the response
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network request failed, checking cache:', error);
  }

  // If network fails, try cache
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // If nothing in cache, return offline page
  const offlineResponse = await cache.match('/offline');
  if (offlineResponse) {
    return offlineResponse;
  }

  // Fallback response
  return new Response(
    '<h1>您离线了</h1><p>请检查您的网络连接。</p>',
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}

/**
 * Handle general requests (Stale-While-Revalidate)
 */
async function handleStaleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        // Clean up old entries before caching
        cleanCache(DYNAMIC_CACHE, MAX_CACHE_SIZE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('[SW] Fetch failed, returning cached version:', error);
      return cachedResponse;
    });

  // Return cached response immediately, update in background
  return cachedResponse || fetchPromise;
}

/**
 * Clean up old cache entries
 */
async function cleanCache(cacheName: string, maxSize: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length === 0) {
    return;
  }

  // Calculate total cache size
  let totalSize = 0;
  const entries: { key: Request; size: number; timestamp: number }[] = [];

  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const size = await getResponseSize(response);
      const timestamp = response.headers.get('date')
        ? new Date(response.headers.get('date')!).getTime()
        : Date.now();
      entries.push({ key, size, timestamp });
      totalSize += size;
    }
  }

  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a.timestamp - b.timestamp);

  // Remove oldest entries if cache exceeds max size
  let currentSize = totalSize;
  for (const entry of entries) {
    if (currentSize <= maxSize) {
      break;
    }

    await cache.delete(entry.key);
    currentSize -= entry.size;
  }

  console.log(`[SW] Cache cleanup: ${cacheName}, removed ${entries.length - entries.filter((e) => e.size <= maxSize / entries.length).length} entries`);
}

/**
 * Get approximate response size
 */
async function getResponseSize(response: Response): Promise<number> {
  const blob = await response.clone().blob();
  return blob.size;
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches');
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

/**
 * Background sync (optional, for future use)
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        // Handle background sync logic here
        // For example: sync offline changes when back online
        console.log('[SW] Syncing offline data...');
      })()
    );
  }
});

/**
 * Push notification (optional, for future use)
 */
self.addEventListener('push', (event: any) => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '7zi Studio 通知',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(self.registration.showNotification(data.title || '7zi Studio', options));
  }
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url || '/')
  );
});

// Type definitions for better TypeScript support
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(promise: Response | Promise<Response>): void;
}

interface ExtendableMessageEvent extends MessageEvent {
  waitUntil(promise: Promise<any>): void;
  ports: MessagePort[];
}
