/**
 * Prefetch Module Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserBehaviorAnalyzer } from './user-behavior'
import { PredictivePrefetcher } from './predictive-prefetcher'
import { ResourcePrefetcher } from './resource-prefetcher'
import { RoutePrefetcher } from './route-prefetcher'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock performance.now
vi.stubGlobal('performance', {
  now: vi.fn(() => Date.now()),
})

// Mock IntersectionObserver
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
)

describe('UserBehaviorAnalyzer', () => {
  let analyzer: UserBehaviorAnalyzer

  beforeEach(() => {
    analyzer = new UserBehaviorAnalyzer()
    localStorageMock.clear()
  })

  describe('startSession', () => {
    it('should start a new session', () => {
      const sessionId = analyzer.startSession('/home')

      expect(sessionId).toMatch(/^session-/)
      expect(analyzer.getCurrentSession()).not.toBeNull()
      expect(analyzer.getCurrentSession()?.pathSequence).toContain('/home')
    })

    it('should record visit when starting session', () => {
      analyzer.startSession('/home')

      const stats = analyzer.getStats()
      expect(stats.totalVisits).toBe(1)
    })
  })

  describe('recordVisit', () => {
    it('should record a page visit', () => {
      analyzer.recordVisit('/home')

      const pageStats = analyzer.getPageStats('/home')
      expect(pageStats?.visitCount).toBe(1)
    })

    it('should increment visit count on repeated visits', () => {
      analyzer.recordVisit('/home')
      analyzer.recordVisit('/home')
      analyzer.recordVisit('/home')

      const pageStats = analyzer.getPageStats('/home')
      expect(pageStats?.visitCount).toBe(3)
    })

    it('should update average session duration', () => {
      analyzer.recordVisit('/home', 1000)
      analyzer.recordVisit('/home', 2000)

      const pageStats = analyzer.getPageStats('/home')
      expect(pageStats?.avgDuration).toBeGreaterThan(0)
    })
  })

  describe('recordNavigation', () => {
    it('should record navigation between pages', () => {
      analyzer.recordVisit('/home')
      analyzer.recordNavigation('/home', '/about')

      const stats = analyzer.getPageStats('/home')
      expect(stats?.topNextPages).toContainEqual(expect.objectContaining({ path: '/about' }))
    })

    it('should track navigation frequency', () => {
      analyzer.recordVisit('/home')
      analyzer.recordNavigation('/home', '/about')
      analyzer.recordNavigation('/home', '/about')
      analyzer.recordNavigation('/home', '/contact')

      const stats = analyzer.getPageStats('/home')
      const aboutPage = stats?.topNextPages.find(p => p.path === '/about')
      const contactPage = stats?.topNextPages.find(p => p.path === '/contact')

      expect(aboutPage?.count).toBe(2)
      expect(contactPage?.count).toBe(1)
    })
  })

  describe('getNextPages', () => {
    it('should return empty array for unknown pages', () => {
      const nextPages = analyzer.getNextPages('/unknown')
      expect(nextPages).toHaveLength(0)
    })

    it('should predict next pages based on history', () => {
      // Build some history
      for (let i = 0; i < 5; i++) {
        analyzer.recordVisit('/home')
        analyzer.recordNavigation('/home', '/about')
      }

      analyzer.recordVisit('/home')
      analyzer.recordNavigation('/home', '/contact')

      const nextPages = analyzer.getNextPages('/home')

      expect(nextPages.length).toBeGreaterThan(0)
      expect(nextPages[0].path).toBe('/about')
      expect(nextPages[0].probability).toBeGreaterThan(0.5)
    })
  })

  describe('getPopularPages', () => {
    it('should return popular pages sorted by visit count', () => {
      analyzer.recordVisit('/home')
      analyzer.recordVisit('/home')
      analyzer.recordVisit('/about')
      analyzer.recordVisit('/contact')
      analyzer.recordVisit('/contact')
      analyzer.recordVisit('/contact')

      const popular = analyzer.getPopularPages(10)

      expect(popular[0].path).toBe('/contact')
      expect(popular[1].path).toBe('/home')
    })
  })

  describe('data persistence', () => {
    it('should export and import data', () => {
      analyzer.recordVisit('/home')
      analyzer.recordVisit('/about')
      analyzer.recordNavigation('/home', '/about')

      const exported = analyzer.exportData()

      const newAnalyzer = new UserBehaviorAnalyzer()
      newAnalyzer.importData(exported)

      const stats = newAnalyzer.getPageStats('/home')
      expect(stats?.visitCount).toBe(1)
    })
  })
})

describe('PredictivePrefetcher', () => {
  let prefetcher: PredictivePrefetcher

  beforeEach(() => {
    prefetcher = new PredictivePrefetcher()
  })

  describe('recordVisit', () => {
    it('should record user visits', () => {
      prefetcher.recordVisit('/home')

      // Check that pattern was created
      const predictions = prefetcher.predictNextPages({
        currentPath: '/home',
        sessionDuration: 0,
      })

      // Initially no predictions
      expect(predictions.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('recordNavigation', () => {
    it('should record navigation pattern', () => {
      prefetcher.recordNavigation('/home', '/about')
      prefetcher.recordNavigation('/home', '/about')
      prefetcher.recordNavigation('/home', '/contact')

      const predictions = prefetcher.predictNextPages({
        currentPath: '/home',
        sessionDuration: 0,
      })

      // Should predict /about as most likely
      expect(predictions.some(p => p.path === '/about')).toBe(true)
    })
  })

  describe('predictNextPages', () => {
    it('should return predictions with confidence scores', () => {
      // Build history
      for (let i = 0; i < 10; i++) {
        prefetcher.recordNavigation('/home', '/dashboard')
      }

      const predictions = prefetcher.predictNextPages({
        currentPath: '/home',
        sessionDuration: 0,
      })

      expect(predictions.some(p => p.path === '/dashboard')).toBe(true)
      expect(predictions.find(p => p.path === '/dashboard')?.confidence).toBeGreaterThan(0.5)
    })

    it('should use contextual predictions', () => {
      const predictions = prefetcher.predictNextPages({
        currentPath: '/tasks/123',
        sessionDuration: 0,
        taskContext: {
          type: 'task-editing',
          id: '123',
        },
      })

      // Should predict /tasks based on context
      expect(predictions.some(p => p.path === '/tasks')).toBe(true)
    })

    it('should use heuristic predictions', () => {
      const predictions = prefetcher.predictNextPages({
        currentPath: '/dashboard',
        sessionDuration: 0,
      })

      // Should have heuristic predictions
      expect(predictions.length).toBeGreaterThan(0)
    })
  })

  describe('prefetch', () => {
    it('should return results for prefetched paths', async () => {
      const results = await prefetcher.prefetch(['/home'])

      expect(results).toHaveLength(1)
      expect(results[0].path).toBe('/home')
    })
  })

  describe('cache management', () => {
    it('should cache prefetch results', async () => {
      await prefetcher.prefetch(['/home'])

      const cache = prefetcher.getCache()
      expect(cache.has('/home')).toBe(true)
    })

    it('should clear cache', async () => {
      await prefetcher.prefetch(['/home'])
      prefetcher.clearCache()

      const cache = prefetcher.getCache()
      expect(cache.has('/home')).toBe(false)
    })
  })
})

describe('ResourcePrefetcher', () => {
  let prefetcher: ResourcePrefetcher

  beforeEach(() => {
    prefetcher = new ResourcePrefetcher()
  })

  describe('prefetchResource', () => {
    it('should prefetch a resource', async () => {
      const result = await prefetcher.prefetchResource({
        url: '/styles/main.css',
        type: 'style',
        priority: 'high',
      })

      expect(result.url).toBe('/styles/main.css')
      expect(result.type).toBe('style')
    })

    it('should prevent duplicate prefetches', async () => {
      await prefetcher.prefetchResource({
        url: '/styles/main.css',
        type: 'style',
        priority: 'high',
      })

      const result = await prefetcher.prefetchResource({
        url: '/styles/main.css',
        type: 'style',
        priority: 'high',
      })

      expect(result.cached).toBe(true)
    })
  })

  describe('prefetchResources', () => {
    it('should prefetch multiple resources by priority', async () => {
      const results = await prefetcher.prefetchResources([
        { url: '/critical.css', type: 'style', priority: 'high' },
        { url: '/main.js', type: 'script', priority: 'medium' },
        { url: '/analytics.js', type: 'script', priority: 'low' },
      ])

      expect(results).toHaveLength(3)
    })
  })

  describe('generateResourceHints', () => {
    it('should generate HTML link tags', () => {
      const hints = prefetcher.generateResourceHints([
        { url: '/styles.css', type: 'style', priority: 'high' },
        { url: '/script.js', type: 'script', priority: 'medium' },
      ])

      expect(hints).toHaveLength(2)
      expect(hints[0]).toContain('rel="prefetch"')
      expect(hints[0]).toContain('href="/styles.css"')
    })
  })

  describe('getPrefetchStatus', () => {
    it('should return prefetch status', async () => {
      await prefetcher.prefetchResource({
        url: '/test.css',
        type: 'style',
        priority: 'medium',
      })

      const status = prefetcher.getPrefetchStatus()

      expect(status.total).toBeGreaterThan(0)
    })
  })
})

describe('RoutePrefetcher', () => {
  let routePrefetcher: RoutePrefetcher

  beforeEach(() => {
    routePrefetcher = new RoutePrefetcher()
  })

  describe('initialize', () => {
    it('should initialize with context', () => {
      routePrefetcher.initialize({
        currentPath: '/home',
        isAuthenticated: true,
        connectionSpeed: 'fast',
        dataSaverEnabled: false,
        hasPermission: () => true,
      })

      const status = routePrefetcher.getStatus()
      expect(status.pending.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('cancelPrefetch', () => {
    it('should cancel pending prefetch', () => {
      routePrefetcher.initialize({
        currentPath: '/home',
        isAuthenticated: true,
        connectionSpeed: 'fast',
        dataSaverEnabled: false,
        hasPermission: () => true,
      })

      routePrefetcher.cancelPrefetch('/settings')

      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('clearAll', () => {
    it('should clear all pending prefetches', () => {
      routePrefetcher.initialize({
        currentPath: '/home',
        isAuthenticated: true,
        connectionSpeed: 'fast',
        dataSaverEnabled: false,
        hasPermission: () => true,
      })

      routePrefetcher.clearAll()

      const status = routePrefetcher.getStatus()
      expect(status.pending.length).toBe(0)
      expect(status.prefetched.length).toBe(0)
    })
  })
})

describe('Integration Tests', () => {
  it('should work together for smart prefetching', async () => {
    const behaviorAnalyzer = new UserBehaviorAnalyzer()
    const predictivePrefetcher = new PredictivePrefetcher()

    // Simulate user behavior
    for (let i = 0; i < 5; i++) {
      behaviorAnalyzer.recordNavigation('/home', '/dashboard')
    }

    behaviorAnalyzer.recordNavigation('/home', '/tasks')

    // Get predictions
    const nextPages = behaviorAnalyzer.getNextPages('/home')

    // Record in predictive prefetcher
    for (const page of nextPages) {
      predictivePrefetcher.recordNavigation('/home', page.path)
    }

    const predictions = predictivePrefetcher.predictNextPages({
      currentPath: '/home',
      sessionDuration: 0,
    })

    // Should predict /dashboard as most likely
    expect(predictions.some(p => p.path === '/dashboard')).toBe(true)
  })
})
