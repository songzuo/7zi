// @ts-nocheck
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
// 直接 import 被 vi.mock 掉的 logger —— 原来用 `require('@/lib/logger')`，
// 在 ESM 环境下 require 不解析 '@' alias → "Cannot find module '@/lib/logger'"。
import { logger as mockedLogger } from '@/lib/logger'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
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
  const originalWindow = global.window

  // 本文件原来引用了从未声明的 `mockWindow` / `mockDocument`，
  // 并且用 `document.visibilityState = 'visible'` 覆盖 jsdom 的只读 getter
  // → setup 阶段抛 `TypeError: Cannot set property visibilityState ...`，
  //   导致整个文件 40 条用例一起挂。
  // 修法：显式声明 mockWindow/mockDocument 指向真实 window/document，
  //      visibilityState 用 `Object.defineProperty` + 可变闭包覆盖（configurable）。
  const mockWindow = global.window as unknown as {
    addEventListener: ReturnType<typeof vi.fn>
    navigator: Navigator & { connection?: { effectiveType?: string } }
    location: { href: string; pathname: string }
    innerWidth: number
    innerHeight: number
  }
  const mockDocument = global.document as unknown as {
    addEventListener: ReturnType<typeof vi.fn>
  }

  // 可变的 visibilityState，测试里通过它切换 hidden/visible
  let mockVisibilityState: 'visible' | 'hidden' = 'visible'

  beforeEach(() => {
    vi.clearAllMocks()

    // 某些用例会临时把 global.window 置为 undefined，用例之间必须还原，
    // 否则后续 beforeEach 里的 Object.defineProperty(window, ...) 会炸。
    global.window = originalWindow
    mockVisibilityState = 'visible'
    global.fetch = vi.fn() as unknown as typeof fetch

    // Setup window properties for jsdom
    // 注意：必须 configurable: true，否则第二个用例的 beforeEach 再次
    // defineProperty 会抛 "Cannot redefine property"。
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        href: 'https://example.com/test',
        pathname: '/test',
      },
    })

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1920,
    })

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 1080,
    })

    Object.defineProperty(window, 'navigator', {
      configurable: true,
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

    // document.visibilityState 在 jsdom 里是**只读 getter**，
    // 直接赋值会抛
    //   TypeError: Cannot set property visibilityState of [object Document]
    //                which has only a getter
    // 用 defineProperty + 闭包覆盖（configurable 才能在 afterEach 还原）。
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => mockVisibilityState,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.window = originalWindow
    vi.clearAllMocks()
  })

  describe('queueMetric', () => {
    it('should queue a metric with correct structure', () => {
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

      expect(() => queueMetric('LCP', 2500, 'good')).not.toThrow()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should handle all rating types', () => {
      const mockLogger = mockedLogger

      queueMetric('LCP', 2500, 'good')
      queueMetric('CLS', 0.15, 'needsImprovement')
      queueMetric('TTFB', 2000, 'poor')

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should include device type in metric', () => {
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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

      const mockLogger = mockedLogger

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

      const mockLogger = mockedLogger

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

      const mockLogger = mockedLogger

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

      const mockLogger = mockedLogger

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
        mockVisibilityState = 'hidden'
        queueMetric('Test', 100, 'good')
        await visibilityCallback()

        expect(fetch).toHaveBeenCalled()
      }
    })

    it('should initialize web-vitals monitoring', async () => {
      const webVitals = await import('web-vitals')

      initPerformanceMonitoring()

      // initPerformanceMonitoring 内部用的是**动态** import('web-vitals')，
      // 回调注册发生在微任务里 → 必须把微任务队列排空后再断言。
      await vi.waitFor(() => {
        expect(webVitals.onLCP).toHaveBeenCalledWith(expect.any(Function))
      })

      expect(webVitals.onCLS).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onTTFB).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onFCP).toHaveBeenCalledWith(expect.any(Function))
      expect(webVitals.onINP).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should log initialization success', async () => {
      const mockLogger = mockedLogger

      initPerformanceMonitoring()

      // After web-vitals is loaded, it should log（同样是动态 import，需等微任务）
      await vi.waitFor(() => {
        expect(mockLogger.info).toHaveBeenCalledWith('Enhanced performance monitoring initialized')
      })
    })

    it('should handle web-vitals import errors gracefully', async () => {
      const mockLogger = mockedLogger

      // Mock a failed import
      vi.doMock('web-vitals', () => {
        throw new Error('Import failed')
      })

      expect(() => initPerformanceMonitoring()).not.toThrow()
    })
  })

  describe('recordCustomMetric', () => {
    it('should queue custom metric', () => {
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

      recordCustomMetric('CustomMetric', 500)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric collected',
        expect.objectContaining({
          rating: 'needsImprovement',
        })
      )
    })

    it('should handle all rating types', () => {
      const mockLogger = mockedLogger

      recordCustomMetric('Good', 100, 'good')
      recordCustomMetric('NeedsImprovement', 500, 'needsImprovement')
      recordCustomMetric('Poor', 2000, 'poor')

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })
  })

  describe('recordApiResponse', () => {
    it('should record API response time with good rating', () => {
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

      recordApiResponse('/api/users', 100)
      recordApiResponse('/api/posts', 200)
      recordApiResponse('/api/comments', 150)

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle edge cases', () => {
      const mockLogger = mockedLogger

      // Exactly at threshold
      recordApiResponse('/api/test', 200) // good
      recordApiResponse('/api/test', 1000) // needsImprovement

      expect(mockLogger.info).toHaveBeenCalledTimes(2)
    })
  })

  describe('recordComponentRender', () => {
    it('should record component render time with good rating', () => {
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

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
      const mockLogger = mockedLogger

      recordComponentRender('Header', 5)
      recordComponentRender('Sidebar', 20)
      recordComponentRender('Content', 30)

      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle edge cases', () => {
      const mockLogger = mockedLogger

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

      const mockLogger = mockedLogger

      queueMetric('Test', 100, 'good')
      await flushMetrics()

      expect(mockLogger.warn).toHaveBeenCalled()
    })

    it('should handle invalid metric values', () => {
      const mockLogger = mockedLogger

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
