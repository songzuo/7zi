/**
 * Service Worker for Mobile Optimization (v1.13.0)
 * Implements advanced caching strategies with intelligent preheating, version management, and LRU cleanup
 */

import { getCacheManager } from './cache-strategy';

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1.13.0';
const CACHE_PREFIX = '7zi-';

// Cache names with version management
const CACHE_NAMES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  dynamic: `${CACHE_PREFIX}dynamic-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}images-${CACHE_VERSION}`,
  critical: `${CACHE_PREFIX}critical-${CACHE_VERSION}`, // New: Critical assets cache
};

// Critical assets to pre-cache (expanded)
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
];

// Intelligent preheating configuration
const PREHEAT_CONFIG = {
  enabled: true,
  maxConcurrent: 3,           // Max concurrent preheating requests
  delayBetween: 1000,         // Delay between batches (ms)
  priorityThreshold: 0.7,     // Priority threshold for preheating
  maxPreheatPerSession: 20,   // Max URLs to preheat per session
};

// LRU configuration
const LRU_CONFIG = {
  enabled: true,
  maxEntriesPerCache: 100,    // Max entries per cache
  cleanupThreshold: 0.8,      // Cleanup when 80% full
  minAccessCount: 2,          // Minimum access count to keep
  ageThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Cache metadata (stored in IndexedDB)
interface CacheMetadata {
  url: string;
  cacheName: string;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: number;
}

// Preheating queue
interface PreheatItem {
  url: string;
  cacheName: string;
  priority: number;
  timestamp: number;
}

let preheatQueue: PreheatItem[] = [];
let isPreheating = false;

// Install event - pre-cache critical assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      console.log('[SW] Installing v1.13.0');
      
      const cache = await caches.open(CACHE_NAMES.static);

      // Pre-cache critical assets
      try {
        await cache.addAll(PRECACHE_ASSETS);
        console.log('[SW] Critical assets precached:', PRECACHE_ASSETS.length);
      } catch (error) {
        console.error('[SW] Precache failed:', error);
      }

      // Initialize cache metadata
      await initializeCacheMetadata();

      // Skip waiting to activate immediately
      self.skipWaiting();
    })()
  );
});

// Activate event - clean old caches and initialize
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      console.log('[SW] Activating v1.13.0');
      
      // Get all cache names
      const cacheNames = await caches.keys();

      // Delete old caches
      const deletedCaches = [];
      for (const cacheName of cacheNames) {
        if (cacheName.startsWith(CACHE_PREFIX) && !Object.values(CACHE_NAMES).includes(cacheName)) {
          await caches.delete(cacheName);
          deletedCaches.push(cacheName);
        }
      }
      
      console.log('[SW] Deleted old caches:', deletedCaches);

      // Perform initial LRU cleanup
      if (LRU_CONFIG.enabled) {
        await performLRUCleanup();
      }

      // Claim all clients
      self.clients.claim();
      
      // Start intelligent preheating
      if (PREHEAT_CONFIG.enabled) {
        startIntelligentPreheating();
      }
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

  // Skip cross-origin requests (except 7zi.com)
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
    let response: Response;

    switch (config.strategy) {
      case 'cache-first':
        response = await cacheFirst(request, config);
        break;
      case 'network-first':
        response = await networkFirst(request, config);
        break;
      case 'stale-while-revalidate':
        response = await staleWhileRevalidate(request, config);
        break;
      case 'cache-only':
        response = await cacheOnly(request, config);
        break;
      case 'network-only':
      default:
        response = await fetch(request);
    }

    // Update cache metadata on access
    await updateCacheMetadata(request.url, config.cacheName);

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);

    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return await getOfflineFallback();
    }

    throw error;
  }
}

/**
 * Cache-first strategy with metadata tracking
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
 * Network-first strategy with metadata tracking
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
          'sw-cache-version': CACHE_VERSION,
        },
      });

      // Calculate response size
      const size = await calculateResponseSize(networkResponse);

      // Store metadata
      await storeCacheMetadata(request.url, config.cacheName, size);

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
 * Stale-while-revalidate strategy with background update
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
            'sw-cache-version': CACHE_VERSION,
          },
        });

        const size = await calculateResponseSize(networkResponse);
        await storeCacheMetadata(request.url, config.cacheName, size);

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
 * Calculate response size
 */
async function calculateResponseSize(response: Response): Promise<number> {
  const blob = await response.clone().blob();
  return blob.size;
}

/**
 * Clean old cache entries (simple FIFO)
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
 * Initialize cache metadata in IndexedDB
 */
async function initializeCacheMetadata(): Promise<void> {
  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readwrite');
    const store = tx.objectStore('metadata');
    await store.clear();
    db.close();
  } catch (error) {
    console.error('[SW] Failed to initialize cache metadata:', error);
  }
}

/**
 * Open IndexedDB for cache metadata
 */
function openCacheMetadataDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('7zi-cache-metadata', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('metadata')) {
        const store = db.createObjectStore('metadata', { keyPath: 'url' });
        store.createIndex('cacheName', 'cacheName', { unique: false });
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
      }
    };
  });
}

/**
 * Store cache metadata
 */
async function storeCacheMetadata(url: string, cacheName: string, size: number): Promise<void> {
  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readwrite');
    const store = tx.objectStore('metadata');

    const metadata: CacheMetadata = {
      url,
      cacheName,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      priority: calculatePriority(url, cacheName),
    };

    await store.put(metadata);
    db.close();
  } catch (error) {
    console.error('[SW] Failed to store cache metadata:', error);
  }
}

/**
 * Update cache metadata on access
 */
async function updateCacheMetadata(url: string, cacheName: string): Promise<void> {
  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readwrite');
    const store = tx.objectStore('metadata');
    const request = store.get(url);

    request.onsuccess = () => {
      const metadata = request.result as CacheMetadata | undefined;
      if (metadata) {
        metadata.accessCount++;
        metadata.lastAccessed = Date.now();
        store.put(metadata);
      }
    };

    db.close();
  } catch (error) {
    console.error('[SW] Failed to update cache metadata:', error);
  }
}

/**
 * Calculate priority for a URL
 */
function calculatePriority(url: string, cacheName: string): number {
  // Critical assets get highest priority
  if (PRECACHE_ASSETS.some(asset => url.endsWith(asset))) {
    return 1.0;
  }

  // Static assets get high priority
  if (cacheName === CACHE_NAMES.static) {
    return 0.9;
  }

  // Images get medium priority
  if (cacheName === CACHE_NAMES.images) {
    return 0.7;
  }

  // API responses get lower priority
  if (cacheName === CACHE_NAMES.api) {
    return 0.5;
  }

  return 0.6;
}

/**
 * Perform LRU cleanup
 */
async function performLRUCleanup(): Promise<void> {
  if (!LRU_CONFIG.enabled) return;

  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.getAll();

    request.onsuccess = async () => {
      const metadata = request.result as CacheMetadata[];
      
      // Group by cache name
      const byCache: Record<string, CacheMetadata[]> = {};
      metadata.forEach(m => {
        if (!byCache[m.cacheName]) byCache[m.cacheName] = [];
        byCache[m.cacheName].push(m);
      });

      // Process each cache
      for (const [cacheName, items] of Object.entries(byCache)) {
        if (items.length > LRU_CONFIG.maxEntriesPerCache * LRU_CONFIG.cleanupThreshold) {
          // Sort by: priority (desc), accessCount (desc), lastAccessed (desc)
          items.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            if (b.accessCount !== a.accessCount) return b.accessCount - a.accessCount;
            return b.lastAccessed - a.lastAccessed;
          });

          // Keep top entries
          const toKeep = items.slice(0, Math.floor(LRU_CONFIG.maxEntriesPerCache * LRU_CONFIG.cleanupThreshold));
          const toDelete = items.slice(toKeep.length);

          // Delete from cache and metadata
          const cache = await caches.open(cacheName);
          for (const item of toDelete) {
            // Skip if recently accessed or high access count
            if (item.accessCount >= LRU_CONFIG.minAccessCount) continue;
            if (Date.now() - item.lastAccessed < LRU_CONFIG.ageThreshold) continue;

            await cache.delete(item.url);
            
            const deleteTx = db.transaction(['metadata'], 'readwrite');
            const deleteStore = deleteTx.objectStore('metadata');
            await deleteStore.delete(item.url);
          }

          console.log(`[SW] LRU cleanup: deleted ${toDelete.length} entries from ${cacheName}`);
        }
      }

      db.close();
    };
  } catch (error) {
    console.error('[SW] LRU cleanup failed:', error);
  }
}

/**
 * Start intelligent preheating
 */
function startIntelligentPreheating(): void {
  if (isPreheating) return;
  isPreheating = true;

  console.log('[SW] Starting intelligent preheating');

  // Build preheating queue based on metadata
  buildPreheatQueue().then(() => {
    processPreheatQueue();
  });
}

/**
 * Build preheating queue from cache metadata
 */
async function buildPreheatQueue(): Promise<void> {
  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.getAll();

    request.onsuccess = () => {
      const metadata = request.result as CacheMetadata[];
      
      // Filter and sort by priority
      preheatQueue = metadata
        .filter(m => m.priority >= PREHEAT_CONFIG.priorityThreshold)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, PREHEAT_CONFIG.maxPreheatPerSession)
        .map(m => ({
          url: m.url,
          cacheName: m.cacheName,
          priority: m.priority,
          timestamp: m.timestamp,
        }));

      console.log(`[SW] Preheat queue built: ${preheatQueue.length} items`);
      db.close();
    };
  } catch (error) {
    console.error('[SW] Failed to build preheat queue:', error);
  }
}

/**
 * Process preheating queue
 */
async function processPreheatQueue(): Promise<void> {
  if (preheatQueue.length === 0) {
    isPreheating = false;
    console.log('[SW] Preheating complete');
    return;
  }

  const batch = preheatQueue.splice(0, PREHEAT_CONFIG.maxConcurrent);
  
  console.log(`[SW] Preheating batch: ${batch.length} items`);

  await Promise.all(
    batch.map(item => preheatUrl(item))
  );

  // Delay before next batch
  if (preheatQueue.length > 0) {
    setTimeout(() => processPreheatQueue(), PREHEAT_CONFIG.delayBetween);
  } else {
    isPreheating = false;
    console.log('[SW] Preheating complete');
  }
}

/**
 * Preheat a single URL
 */
async function preheatUrl(item: PreheatItem): Promise<void> {
  try {
    const response = await fetch(item.url);
    if (response.ok) {
      const cache = await caches.open(item.cacheName);
      await cache.put(item.url, response.clone());
      console.log(`[SW] Preheated: ${item.url}`);
    }
  } catch (error) {
    console.error(`[SW] Preheat failed for ${item.url}:`, error);
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

    case 'TRIGGER_PREHEAT':
      startIntelligentPreheating();
      break;

    case 'PERFORM_LRU_CLEANUP':
      performLRUCleanup();
      break;

    default:
      console.warn('[SW] Unknown message type:', type);
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
  const stats: Record<string, any> = {};

  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    if (name.startsWith(CACHE_PREFIX)) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      stats[name] = {
        count: keys.length,
        version: name.split('-').pop(),
      };
    }
  }

  // Add metadata stats
  try {
    const db = await openCacheMetadataDB();
    const tx = db.transaction(['metadata'], 'readonly');
    const store = tx.objectStore('metadata');
    const countRequest = store.count();
    
    countRequest.onsuccess = () => {
      stats.metadata = {
        totalEntries: countRequest.result,
      };
      port.postMessage({ type: 'STATS', payload: stats });
      db.close();
    };
  } catch (error) {
    port.postMessage({ type: 'STATS', payload: stats });
  }
}

export {};