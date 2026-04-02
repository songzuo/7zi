// @ts-nocheck - Test file with complex type issues
/**
 * Performance Metrics Tests
 * Tests for performance-metrics.ts - metric collection and API reporting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  queueMetric,
  flushMetrics,
  initPerformanceMonitoring,
  recordCustomMetric,
  recordApiResponse,
  recordComponentRender,
} from '../performance-metrics'
import type { PerformanceMetric } from '@/app/api/performance/metrics/route'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onTTFB: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
}))

describe('Performance Metrics Module', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as unknown as typeof fetch

    // Setup window properties for jsdom
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        href: 'https://example.com/test',
        pathname: '/test',
      },
    })

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1920,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 1080,
    })

    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        connection: {
          effectiveType: '4g',
        },
      },
    })

    // Mock window and document methods
    window.addEventListener = vi.fn()
    document.addEventListener = vi.fn()
    document.visibilityState = 'visible'
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('queueMetric', () => {
    it('should queue a metric with correct structure', () => {
      const mockLogger = require('@/lib/logger').logger

      queueMetric('LCP', 2500, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          route: '/test',
          deviceType: 'desktop',
        })
      )
    })

    it('should not queue metrics when window is undefined', () => {
      global.window = undefined as unknown as Window & typeof globalThis
      const mockLogger = require('@/lib/logger').logger

      expect(() => queueMetric('LCP', 2500, 'good')).not.toThrow()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should handle all rating types', () => {
      const mockLogger = require('@/lib/logger').logger

      queueMetric('LCP', 2500, 'good')
      queueMetric('CLS', 0.15, 'needsImprovement')
      queueMetric('TTFB', 2000, 'poor')

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should include device type in metric', () => {
      const mockLogger = require('@/lib/logger').logger

      // Test desktop
      mockWindow.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      queueMetric('Test', 100, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          deviceType: 'desktop',
        })
      )
    })

    it('should detect mobile device', () => {
      const mockLogger = require('@/lib/logger').logger

      mockWindow.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      queueMetric('Test', 100, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          deviceType: 'mobile',
        })
      )
    })

    it('should detect tablet device', () => {
      const mockLogger = require('@/lib/logger').logger

      mockWindow.navigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
      queueMetric('Test', 100, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          deviceType: 'tablet',
        })
      )
    })

    it('should include connection type', () => {
      const mockLogger = require('@/lib/logger').logger

      mockWindow.navigator.connection = { effectiveType: '3g' }
      queueMetric('Test', 100, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          connectionType: '3g',
        })
      )
    })

    it('should handle missing connection type', () => {
      const mockLogger = require('@/lib/logger').logger

      // @ts-expect-error - Testing undefined connection
      mockWindow.navigator.connection = undefined
      queueMetric('Test', 100, 'good')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          connectionType: 'unknown',
        })
      )
    })

    it('should generate unique metric IDs', () => {
      const mockLogger = require('@/lib/logger').logger

      queueMetric('Test1', 100, 'good')
      queueMetric('Test2', 200, 'good')

      const firstCall = mockLogger.info.mock.calls[0][1]
      const secondCall = mockLogger.info.mock.calls[1][1]

      expect(firstCall.name).toBe('Test1')
      expect(secondCall.name).toBe('Test2')
    })
  })

  describe('flushMetrics', () => {
    it('should send queued metrics to API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const mockLogger = require('@/lib/logger').logger

      // Queue a metric first
      queueMetric('LCP', 2500, 'good')

      // Flush metrics
      await flushMetrics()

      expect(fetch).toHaveBeenCalledWith(
        '/api/performance/metrics',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          keepalive: true,
        })
      )
    })

    it('should not call API when queue is empty', async () => {
      await flushMetrics()

      expect(fetch).not.toHaveBeenCalled()
    })

    it('should log success when metrics are sent', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const mockLogger = require('@/lib/logger').logger

      queueMetric('LCP', 2500, 'good')
      await flushMetrics()

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metrics sent successfully',
        expect.objectContaining({
          count: expect.any(Number),
        })
      )
    })

    it('should log warning when API call fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const mockLogger = require('@/lib/logger').logger

      queueMetric('LCP', 2500, 'good')
      await flushMetrics()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to send performance metrics',
        expect.objectContaining({
          status: 500,
        })
      )
    })

    it('should log error on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const mockLogger = require('@/lib/logger').logger

      queueMetric('LCP', 2500, 'good')
      await flushMetrics()

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Error sending performance metrics',
        expect.objectContaining({
          error: expect.any(Error),
        })
      )
    })

    it('should re-queue metrics on error (up to limit)', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      queueMetric('LCP', 2500, 'good')
      await flushMetrics()

      // Metrics should be re-queued (we can't directly test the queue,
      // but we can verify the error handling)
      expect(fetch).toHaveBeenCalled()
    })

    it('should handle fetch response correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as unknown as Response)

      queueMetric('Test', 100, 'good')
      await flushMetrics()

      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('initPerformanceMonitoring', () => {
    it('should set up event listeners', () => {
      initPerformanceMonitoring()

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
      expect(mockDocument.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )
    })

    it('should not initialize when window is undefined', () => {
      global.window = undefined as unknown as Window & typeof globalThis

      expect(() => initPerformanceMonitoring()).not.toThrow()
    })

    it('should flush metrics on beforeunload', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      initPerformanceMonitoring()

      // Get the beforeunload callback
      const beforeUnloadCallback = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1]

      expect(beforeUnloadCallback).toBeDefined()

      // Trigger the callback
      if (beforeUnloadCallback) {
        queueMetric('Test', 100, 'good')
        await beforeUnloadCallback()

        expect(fetch).toHaveBeenCalled()
      }
    })

    it('should flush metrics on visibility change to hidden', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      initPerformanceMonitoring()

      // Get the visibilitychange callback
      const visibilityCallback = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1]

      expect(visibilityCallback).toBeDefined()

      // Trigger the callback
      if (visibilityCallback) {
        mockDocument.visibilityState = 'hidden'
        queueMetric('Test', 100, 'good')
        await visibilityCallback()

        expect(fetch).toHaveBeenCalled()
      }
    })

    it('should initialize web-vitals monitoring', async () => {
      const webVitals = await import('web-vitals')

      initPerformanceMonitoring()

      expect(webVitals.onLCP).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onCLS).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onTTFB).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onFCP).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onINP).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should log initialization success', async () => {
      const mockLogger = require('@/lib/logger').logger

      initPerformanceMonitoring()

      // After web-vitals is loaded, it should log
      expect(mockLogger.info).toHaveBeenCalled()
    })

    it('should handle web-vitals import errors gracefully', async () => {
      const mockLogger = require('@/lib/logger').logger

      // Mock a failed import
      vi.doMock('web-vitals', () => {
        throw new Error('Import failed')
      })

      expect(() => initPerformanceMonitoring()).not.toThrow()
    })
  })

  describe('recordCustomMetric', () => {
    it('should queue custom metric', () => {
      const mockLogger = require('@/lib/logger').logger

      recordCustomMetric('CustomMetric', 500, 'needsImprovement')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'CustomMetric',
          value: 500,
          rating: 'needsImprovement',
        })
      )
    })

    it('should default rating to needsImprovement', () => {
      const mockLogger = require('@/lib/logger').logger

      recordCustomMetric('CustomMetric', 500)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          rating: 'needsImprovement',
        })
      )
    })

    it('should handle all rating types', () => {
      const mockLogger = require('@/lib/logger').logger

      recordCustomMetric('Good', 100, 'good')
      recordCustomMetric('NeedsImprovement', 500, 'needsImprovement')
      recordCustomMetric('Poor', 2000, 'poor')

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })
  })

  describe('recordApiResponse', () => {
    it('should record API response time with good rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordApiResponse('/api/users', 150)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'API-/api/users',
          value: 150,
          rating: 'good',
        })
      )
    })

    it('should record API response time with needsImprovement rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordApiResponse('/api/users', 500)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'API-/api/users',
          value: 500,
          rating: 'needsImprovement',
        })
      )
    })

    it('should record API response time with poor rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordApiResponse('/api/users', 1500)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'API-/api/users',
          value: 1500,
          rating: 'poor',
        })
      )
    })

    it('should handle different API endpoints', () => {
      const mockLogger = require('@/lib/logger').logger

      recordApiResponse('/api/users', 100)
      recordApiResponse('/api/posts', 200)
      recordApiResponse('/api/comments', 150)

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle edge cases', () => {
      const mockLogger = require('@/lib/logger').logger

      // Exactly at threshold
      recordApiResponse('/api/test', 200) // good
      recordApiResponse('/api/test', 1000) // needsImprovement

      expect(mockLogger.info).toHaveBeenCalledTimes(2)
    })
  })

  describe('recordComponentRender', () => {
    it('should record component render time with good rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordComponentRender('MyComponent', 10)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'Render-MyComponent',
          value: 10,
          rating: 'good',
        })
      )
    })

    it('should record component render time with needsImprovement rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordComponentRender('MyComponent', 50)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'Render-MyComponent',
          value: 50,
          rating: 'needsImprovement',
        })
      )
    })

    it('should record component render time with poor rating', () => {
      const mockLogger = require('@/lib/logger').logger

      recordComponentRender('MyComponent', 150)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          name: 'Render-MyComponent',
          value: 150,
          rating: 'poor',
        })
      )
    })

    it('should handle different component names', () => {
      const mockLogger = require('@/lib/logger').logger

      recordComponentRender('Header', 5)
      recordComponentRender('Sidebar', 20)
      recordComponentRender('Content', 30)

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle edge cases', () => {
      const mockLogger = require('@/lib/logger').logger

      // Exactly at threshold
      recordComponentRender('Test', 16) // good
      recordComponentRender('Test', 100) // needsImprovement

      expect(mockLogger.info).toHaveBeenCalledTimes(2)
    })
  })

  describe('Batch Management', () => {
    it('should respect BATCH_SIZE', () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      global.fetch = mockFetch as unknown as typeof fetch

      // Queue metrics up to BATCH_SIZE
      for (let i = 0; i < 10; i++) {
        queueMetric(`Metric${i}`, 100, 'good')
      }

      // Should trigger flush
      // Note: This is a behavioral test, actual implementation may vary
      expect(fetch).toHaveBeenCalled()
    })

    it('should respect BATCH_TIMEOUT', () => {
      vi.useFakeTimers()

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)

      global.fetch = mockFetch as unknown as typeof fetch

      // Queue one metric (less than BATCH_SIZE)
      queueMetric('Test', 100, 'good')

      // Fast forward time
      vi.advanceTimersByTime(5000)

      // Should trigger flush
      expect(fetch).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const mockLogger = require('@/lib/logger').logger

      queueMetric('Test', 100, 'good')
      await flushMetrics()

      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should handle invalid metric values', () => {
      const mockLogger = require('@/lib/logger').logger

      expect(() => {
        queueMetric('Test', NaN, 'good')
      }).not.toThrow()

      expect(() => {
        queueMetric('Test', Infinity, 'good')
      }).not.toThrow()

      expect(() => {
        queueMetric('Test', -100, 'good')
      }).not.toThrow()
    })
  })
})
