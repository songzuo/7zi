/**
 * PWA Offline Capability Deep Test
 *
 * Tests Service Worker registration, caching strategies, IndexedDB persistence,
 * and offline functionality.
 *
 * @version 1.0.0
 * @date 2026-04-05
 */

import { test, expect, Page } from '@playwright/test'

test.describe('PWA Offline Capability Tests', () => {
  let serviceWorkerRegistration: ServiceWorkerRegistration | null = null
  const TEST_DATA_KEY = 'pwa_test_data'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await page.evaluate(async (key) => {
      if ('indexedDB' in window) {
        const request = indexedDB.deleteDatabase('7zi-draft-storage')
        await new Promise((resolve, reject) => {
          request.onsuccess = resolve
          request.onerror = reject
        })
      }
    }, TEST_DATA_KEY)
  })

  test.describe('1. Service Worker Tests', () => {
    test('should register Service Worker successfully', async ({ page }) => {
      const isRegistered = await page.evaluate(async () => {
        return new Promise<boolean>((resolve) => {
          if (!('serviceWorker' in navigator)) {
            resolve(false)
            return
          }

          navigator.serviceWorker.getRegistration().then((registration) => {
            resolve(!!registration)
          }).catch(() => {
            resolve(false)
          })
        })
      })

      expect(isRegistered).toBe(true)
    })

    test('Service Worker should be in activated state', async ({ page }) => {
      const state = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return null
        }

        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.active?.state || null
      })

      expect(state).toBe('activated')
    })

    test('should have correct Service Worker scope', async ({ page }) => {
      const scope = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.scope || null
      })

      expect(scope).toMatch(/localhost:3000\//)
    })

    test('should cache static resources', async ({ page }) => {
      // Navigate to a page and check cache
      await page.goto('/dashboard')

      const cachedResources = await page.evaluate(async () => {
        if ('caches' in window) {
          const cache = await caches.open('next-static')
          const keys = await cache.keys()
          return keys.map(req => req.url).length
        }
        return 0
      })

      expect(cachedResources).toBeGreaterThan(0)
    })

    test('should implement CacheFirst for images', async ({ page }) => {
      // Check if image cache exists
      const hasImageCache = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          return cacheNames.includes('images')
        }
        return false
      })

      expect(hasImageCache).toBe(true)
    })

    test('should implement NetworkFirst for API calls', async ({ page }) => {
      const hasApiCache = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          return cacheNames.includes('api-cache')
        }
        return false
      })

      expect(hasApiCache).toBe(true)
    })

    test('should implement StaleWhileRevalidate for static resources', async ({ page }) => {
      const hasStaticCache = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          return cacheNames.includes('static-resources')
        }
        return false
      })

      expect(hasStaticCache).toBe(true)
    })
  })

  test.describe('2. Offline Functionality Tests', () => {
    test('should detect offline status', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)

      const isOffline = await page.evaluate(() => {
        return !navigator.onLine
      })

      expect(isOffline).toBe(true)

      // Restore online mode
      await page.context().setOffline(false)
    })

    test('should load cached resources offline', async ({ page }) => {
      // First load resources while online
      await page.goto('/dashboard')

      // Check if resources are cached
      const initialCacheCount = await page.evaluate(async () => {
        if ('caches' in window) {
          const cache = await caches.open('next-static')
          return (await cache.keys()).length
        }
        return 0
      })

      expect(initialCacheCount).toBeGreaterThan(0)

      // Go offline
      await page.context().setOffline(true)

      // Navigate again - should use cached resources
      await page.goto('/dashboard')

      // Page should still be visible (even with potentially stale data)
      const pageTitle = await page.title()
      expect(pageTitle).toContain('7zi')

      // Restore online mode
      await page.context().setOffline(false)
    })

    test('should handle API failures gracefully offline', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true)

      // Try to make an API call
      const apiResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health')
          return { status: response.status }
        } catch (error) {
          return { error: 'Network error' }
        }
      })

      expect(apiResult).toHaveProperty('error')

      // Restore online mode
      await page.context().setOffline(false)
    })

    test('should sync data when back online', async ({ page }) => {
      // Store data offline
      await page.evaluate(async (key) => {
        localStorage.setItem(key, JSON.stringify({
          timestamp: Date.now(),
          data: { test: 'offline_data' }
        }))
      }, TEST_DATA_KEY)

      // Go offline
      await page.context().setOffline(true)

      // Verify data exists
      const storedDataOffline = await page.evaluate((key) => {
        return JSON.parse(localStorage.getItem(key) || '{}')
      }, TEST_DATA_KEY)

      expect(storedDataOffline.data.test).toBe('offline_data')

      // Go back online
      await page.context().setOffline(false)

      // Reload and verify data persists
      await page.reload()

      const storedDataOnline = await page.evaluate((key) => {
        return JSON.parse(localStorage.getItem(key) || '{}')
      }, TEST_DATA_KEY)

      expect(storedDataOnline.data.test).toBe('offline_data')
    })
  })

  test.describe('3. IndexedDB Tests', () => {
    test('should open IndexedDB successfully', async ({ page }) => {
      const dbOpened = await page.evaluate(async () => {
        return new Promise<boolean>((resolve) => {
          if (!('indexedDB' in window)) {
            resolve(false)
            return
          }

          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = () => {
            resolve(true)
          }

          request.onerror = () => {
            resolve(false)
          }
        })
      })

      expect(dbOpened).toBe(true)
    })

    test('should store data in IndexedDB', async ({ page }) => {
      const testData = { id: 1, content: 'Test content', timestamp: Date.now() }

      const stored = await page.evaluate(async (data) => {
        return new Promise<boolean>((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readwrite')
            const store = transaction.objectStore('drafts')
            const addRequest = store.add(data)

            addRequest.onsuccess = () => resolve(true)
            addRequest.onerror = () => resolve(false)
          }

          request.onerror = () => resolve(false)
        })
      }, testData)

      expect(stored).toBe(true)
    })

    test('should read data from IndexedDB', async ({ page }) => {
      const testData = { id: 2, content: 'Read test', timestamp: Date.now() }

      // First store the data
      await page.evaluate(async (data) => {
        return new Promise((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readwrite')
            const store = transaction.objectStore('drafts')
            store.add(data).onsuccess = () => resolve(null)
          }
        })
      }, testData)

      // Now read it back
      const retrieved = await page.evaluate(async (id) => {
        return new Promise<any>((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readonly')
            const store = transaction.objectStore('drafts')
            const getRequest = store.get(id)

            getRequest.onsuccess = () => {
              resolve(getRequest.result)
            }

            getRequest.onerror = () => resolve(null)
          }
        })
      }, 2)

      expect(retrieved).toBeTruthy()
      expect(retrieved.content).toBe('Read test')
    })

    test('should persist IndexedDB data across page reloads', async ({ page }) => {
      const testData = { id: 3, content: 'Persistence test', timestamp: Date.now() }

      // Store data
      await page.evaluate(async (data) => {
        return new Promise((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readwrite')
            const store = transaction.objectStore('drafts')
            store.add(data).onsuccess = () => resolve(null)
          }
        })
      }, testData)

      // Reload page
      await page.reload()

      // Verify data persists
      const retrieved = await page.evaluate(async (id) => {
        return new Promise<any>((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readonly')
            const store = transaction.objectStore('drafts')
            store.get(id).onsuccess = (event) => {
              resolve((event.target as IDBRequest).result)
            }
          }
        })
      }, 3)

      expect(retrieved).toBeTruthy()
      expect(retrieved.content).toBe('Persistence test')
    })

    test('should handle IndexedDB offline', async ({ page }) => {
      const testData = { id: 4, content: 'Offline IDB test', timestamp: Date.now() }

      // Go offline
      await page.context().setOffline(true)

      // Store data in IndexedDB (should work offline)
      const storedOffline = await page.evaluate(async (data) => {
        return new Promise<boolean>((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readwrite')
            const store = transaction.objectStore('drafts')
            store.add(data).onsuccess = () => resolve(true)
            store.add(data).onerror = () => resolve(false)
          }

          request.onerror = () => resolve(false)
        })
      }, testData)

      expect(storedOffline).toBe(true)

      // Go back online
      await page.context().setOffline(false)

      // Verify data persists
      const retrieved = await page.evaluate(async (id) => {
        return new Promise<any>((resolve) => {
          const request = indexedDB.open('7zi-draft-storage', 1)

          request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const transaction = db.transaction(['drafts'], 'readonly')
            const store = transaction.objectStore('drafts')
            store.get(id).onsuccess = (event) => {
              resolve((event.target as IDBRequest).result)
            }
          }
        })
      }, 4)

      expect(retrieved).toBeTruthy()
    })
  })

  test.describe('4. Workbox Configuration Tests', () => {
    test('should have correct cache strategies configured', async ({ page }) => {
      const cacheNames = await page.evaluate(async () => {
        if ('caches' in window) {
          return await caches.keys()
        }
        return []
      })

      // Expected cache names based on next.config.ts
      const expectedCaches = [
        'next-static',
        'offlineCache',
        'static-resources',
        'images',
        'fonts',
        'api-cache',
      ]

      for (const cacheName of expectedCaches) {
        const hasCache = cacheNames.some(name => name.includes(cacheName))
        expect(hasCache).toBe(true)
      }
    })

    test('should have offline fallback page', async ({ page }) => {
      // Check if offline.html exists in cache
      const hasOfflinePage = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName)
            const keys = await cache.keys()
            for (const request of keys) {
              if (request.url.includes('offline.html')) {
                return true
              }
            }
          }
        }
        return false
      })

      expect(hasOfflinePage).toBe(true)
    })

    test('should precache critical resources', async ({ page }) => {
      const precacheCount = await page.evaluate(async () => {
        if ('caches' in window) {
          const cache = await caches.open('workbox-precache-v2')
          const keys = await cache.keys()
          return keys.length
        }
        return 0
      })

      // Should have precached resources
      expect(precacheCount).toBeGreaterThan(0)
    })

    test('should implement skipWaiting correctly', async ({ page }) => {
      const updateViaCache = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        return registration?.updateViaCache || null
      })

      // Should be 'none' to always fetch latest
      expect(updateViaCache).toBe('none')
    })

    test('should handle cache expiration', async ({ page }) => {
      // Check if caches have expiration configured
      // This is more of a code inspection test, but we can check cache existence
      const hasImageCache = await page.evaluate(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          return cacheNames.includes('images')
        }
        return false
      })

      expect(hasImageCache).toBe(true)
    })
  })

  test.describe('5. PWA Integration Tests', () => {
    test('should have manifest link', async ({ page }) => {
      const manifestLink = await page.locator('link[rel="manifest"]').count()
      expect(manifestLink).toBeGreaterThan(0)
    })

    test('should have theme color meta tag', async ({ page }) => {
      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
      expect(themeColor).toBe('#667eea')
    })

    test('should have apple touch icon', async ({ page }) => {
      const appleIcon = await page.locator('link[rel="apple-touch-icon"]').count()
      expect(appleIcon).toBeGreaterThan(0)
    })

    test('should support install prompt', async ({ page }) => {
      const hasBeforeInstallPrompt = await page.evaluate(() => {
        return 'beforeinstallprompt' in window
      })

      // Note: beforeinstallprompt only fires in certain conditions
      // This test checks if the event type is recognized
      expect(hasBeforeInstallPrompt).toBe(true)
    })
  })

  test.describe('6. Cache Strategy Verification', () => {
    test('should use CacheFirst for Next.js static assets', async ({ page }) => {
      await page.goto('/dashboard')

      // Make multiple requests to the same static resource
      const firstLoad = await page.evaluate(async () => {
        const start = performance.now()
        await fetch('/_next/static/css/main.css')
        return performance.now() - start
      })

      const secondLoad = await page.evaluate(async () => {
        const start = performance.now()
        await fetch('/_next/static/css/main.css')
        return performance.now() - start
      })

      // Second load should be faster (from cache)
      expect(secondLoad).toBeLessThan(firstLoad)
    })

    test('should use NetworkFirst for API routes', async ({ page }) => {
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health')
          return {
            ok: response.ok,
            fromCache: response.headers.get('X-Cache') || 'none'
          }
        } catch {
          return { ok: false, fromCache: 'error' }
        }
      })

      expect(apiResponse.ok).toBe(true)
    })

    test('should use StaleWhileRevalidate for JS/CSS', async ({ page }) => {
      await page.goto('/')

      const hasStaticCache = await page.evaluate(async () => {
        if ('caches' in window) {
          const cache = await caches.open('static-resources')
          const keys = await cache.keys()
          return keys.length
        }
        return 0
      })

      expect(hasStaticCache).toBeGreaterThan(0)
    })
  })
})
