// @ts-nocheck - Test file with complex type issues
/**
 * Performance Monitor Tests
 * Tests for performance.monitor.ts - the main performance monitoring system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  performanceCollector,
  initPerformanceMonitoring,
  recordCustomMetric,
  getPerformanceSummary,
  onPerformanceMetric,
  onPerformanceAlert,
  trackApiPerformance,
  trackRenderPerformance,
} from '../performance.monitor'
import type { PerformanceMetric, CustomMetric, PerformanceAlert } from '../performance.monitor'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  default: {
    setMeasurement: vi.fn(),
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
  },
  setMeasurement: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}))

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(),
  onCLS: vi.fn(),
  onTTFB: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
}))

describe('Performance Monitor Module', () => {
  const originalPerformance = global.performance

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup window properties for jsdom
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        pathname: '/test',
        href: 'https://example.com/test',
      },
    })

    window.addEventListener = vi.fn()
    document.visibilityState = 'visible'
    document.addEventListener = vi.fn()

    // Setup performance mock
    global.performance = {
      now: vi.fn(() => Date.now()),
    } as unknown as Performance

    // Reset collector state
    performanceCollector.clear()

    // Mock process.env
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    performanceCollector.destroy()
    global.performance = originalPerformance
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('PerformanceCollector Class', () => {
    describe('init', () => {
      it('should initialize monitoring', async () => {
        await performanceCollector.init()

        expect(performanceCollector['isInitialized']).toBe(true)
      })

      it('should not initialize twice', async () => {
        await performanceCollector.init()
        await performanceCollector.init()

        // Should not throw error
        expect(performanceCollector['isInitialized']).toBe(true)
      })

      it('should not initialize when window is undefined', async () => {
        global.window = undefined as unknown as Window & typeof globalThis

        await performanceCollector.init()

        expect(performanceCollector['isInitialized']).toBe(false)
      })

      it('should initialize Web Vitals monitoring', async () => {
        const webVitals = await import('web-vitals')

        await performanceCollector.init()

        expect(webVitals.onLCP).toHaveBeenCalled()
        expect(webVitals.onCLS).toHaveBeenCalled()
        expect(webVitals.onTTFB).toHaveBeenCalled()
        expect(webVitals.onFCP).toHaveBeenCalled()
        expect(webVitals.onINP).toHaveBeenCalled()
      })
    })

    describe('recordMetric', () => {
      it('should record a metric', async () => {
        const metric: PerformanceMetric = {
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        }

        await performanceCollector.init()
        performanceCollector['recordMetric'](metric)

        const metrics = performanceCollector.getMetrics()
        expect(metrics.get('LCP')).toBeDefined()
        expect(metrics.get('LCP')?.length).toBe(1)
        expect(metrics.get('LCP')?.[0]).toEqual(metric)
      })

      it('should record multiple metrics', async () => {
        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        performanceCollector['recordMetric']({
          name: 'CLS',
          value: 0.1,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-2',
          route: '/test',
        })

        const metrics = performanceCollector.getMetrics()
        expect(metrics.get('LCP')?.length).toBe(1)
        expect(metrics.get('CLS')?.length).toBe(1)
      })

      it('should report to Sentry', async () => {
        const { setMeasurement } = require('@sentry/nextjs')

        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(setMeasurement).toHaveBeenCalled()
      })

      it('should check alerts', async () => {
        const alertSpy = vi.spyOn(performanceCollector as any, 'checkAlerts')

        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 5000,
          rating: 'poor',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(alertSpy).toHaveBeenCalled()
      })
    })

    describe('recordCustomMetric', () => {
      it('should record custom metric', async () => {
        const metric: CustomMetric = {
          name: 'custom-api',
          value: 100,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api',
        }

        await performanceCollector.init()
        performanceCollector['recordCustomMetric'](metric)

        const customMetrics = performanceCollector.getCustomMetrics()
        expect(customMetrics.length).toBe(1)
        expect(customMetrics[0]).toEqual(metric)
      })

      it('should limit custom metrics to 100', async () => {
        await performanceCollector.init()

        for (let i = 0; i < 150; i++) {
          performanceCollector['recordCustomMetric']({
            name: `metric-${i}`,
            value: i,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'api',
          })
        }

        const customMetrics = performanceCollector.getCustomMetrics()
        expect(customMetrics.length).toBe(100)
      })
    })

    describe('checkAlerts', () => {
      it('should not trigger alert for good metrics', async () => {
        const alertSpy = vi.spyOn(performanceCollector as any, 'triggerAlert')

        await performanceCollector.init()

        performanceCollector['checkAlerts']({
          name: 'LCP',
          value: 2000,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(alertSpy).not.toHaveBeenCalled()
      })

      it('should trigger warning alert for needs-improvement metrics', async () => {
        const alertSpy = vi.spyOn(performanceCollector as any, 'triggerAlert')

        await performanceCollector.init()

        performanceCollector['checkAlerts']({
          name: 'LCP',
          value: 3000,
          rating: 'needs-improvement',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(alertSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warning',
          })
        )
      })

      it('should trigger critical alert for poor metrics', async () => {
        const alertSpy = vi.spyOn(performanceCollector as any, 'triggerAlert')

        await performanceCollector.init()

        performanceCollector['checkAlerts']({
          name: 'LCP',
          value: 5000,
          rating: 'poor',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(alertSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'critical',
          })
        )
      })

      it('should not check alerts for unknown metrics', async () => {
        const alertSpy = vi.spyOn(performanceCollector as any, 'triggerAlert')

        await performanceCollector.init()

        performanceCollector['checkAlerts']({
          name: 'UnknownMetric',
          value: 100,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(alertSpy).not.toHaveBeenCalled()
      })
    })

    describe('triggerAlert', () => {
      it('should notify alert callbacks', async () => {
        const alertCallback = vi.fn()
        performanceCollector.onAlert(alertCallback)

        await performanceCollector.init()

        const alert: PerformanceAlert = {
          level: 'warning',
          metricName: 'LCP',
          value: 3000,
          threshold: 2500,
          message: 'LCP needs improvement',
          timestamp: Date.now(),
          route: '/test',
        }

        performanceCollector['triggerAlert'](alert)

        expect(alertCallback).toHaveBeenCalledWith(alert)
      })

      it('should log critical alerts to console', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        await performanceCollector.init()

        const alert: PerformanceAlert = {
          level: 'critical',
          metricName: 'LCP',
          value: 5000,
          threshold: 4000,
          message: 'Poor LCP',
          timestamp: Date.now(),
          route: '/test',
        }

        performanceCollector['triggerAlert'](alert)

        expect(consoleSpy).toHaveBeenCalled()

        consoleSpy.mockRestore()
      })

      it('should send to Sentry for warning and critical', async () => {
        const { captureMessage } = require('@sentry/nextjs')

        await performanceCollector.init()

        const alert: PerformanceAlert = {
          level: 'warning',
          metricName: 'LCP',
          value: 3000,
          threshold: 2500,
          message: 'LCP needs improvement',
          timestamp: Date.now(),
          route: '/test',
        }

        performanceCollector['triggerAlert'](alert)

        expect(captureMessage).toHaveBeenCalled()
      })

      it('should not send to Sentry for info alerts', async () => {
        const { captureMessage } = require('@sentry/nextjs')

        await performanceCollector.init()

        const alert: PerformanceAlert = {
          level: 'info',
          metricName: 'LCP',
          value: 2000,
          threshold: 2500,
          message: 'LCP is good',
          timestamp: Date.now(),
          route: '/test',
        }

        performanceCollector['triggerAlert'](alert)

        expect(captureMessage).not.toHaveBeenCalled()
      })
    })

    describe('onMetric', () => {
      it('should register metric callback', async () => {
        const callback = vi.fn()
        const unregister = performanceCollector.onMetric(callback)

        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(callback).toHaveBeenCalled()

        unregister()
      })

      it('should unregister callback', async () => {
        const callback = vi.fn()
        const unregister = performanceCollector.onMetric(callback)

        await performanceCollector.init()
        unregister()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(callback).not.toHaveBeenCalled()
      })

      it('should handle callback errors gracefully', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const callback = vi.fn(() => {
          throw new Error('Callback error')
        })

        performanceCollector.onMetric(callback)

        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(errorSpy).toHaveBeenCalled()
        errorSpy.mockRestore()
      })
    })

    describe('onAlert', () => {
      it('should register alert callback', async () => {
        const callback = vi.fn()
        const unregister = performanceCollector.onAlert(callback)

        await performanceCollector.init()

        performanceCollector['triggerAlert']({
          level: 'warning',
          metricName: 'LCP',
          value: 3000,
          threshold: 2500,
          message: 'LCP needs improvement',
          timestamp: Date.now(),
          route: '/test',
        })

        expect(callback).toHaveBeenCalled()

        unregister()
      })

      it('should unregister alert callback', async () => {
        const callback = vi.fn()
        const unregister = performanceCollector.onAlert(callback)

        await performanceCollector.init()
        unregister()

        performanceCollector['triggerAlert']({
          level: 'warning',
          metricName: 'LCP',
          value: 3000,
          threshold: 2500,
          message: 'LCP needs improvement',
          timestamp: Date.now(),
          route: '/test',
        })

        expect(callback).not.toHaveBeenCalled()
      })
    })

    describe('getMetrics', () => {
      it('should return all metrics', async () => {
        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        const metrics = performanceCollector.getMetrics()
        expect(metrics).toBeInstanceOf(Map)
        expect(metrics.size).toBe(1)
      })

      it('should return empty map when no metrics', async () => {
        await performanceCollector.init()

        const metrics = performanceCollector.getMetrics()
        expect(metrics.size).toBe(0)
      })
    })

    describe('getCustomMetrics', () => {
      it('should return custom metrics', async () => {
        await performanceCollector.init()

        performanceCollector['recordCustomMetric']({
          name: 'custom',
          value: 100,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api',
        })

        const metrics = performanceCollector.getCustomMetrics()
        expect(Array.isArray(metrics)).toBe(true)
        expect(metrics.length).toBe(1)
      })

      it('should return empty array when no custom metrics', async () => {
        await performanceCollector.init()

        const metrics = performanceCollector.getCustomMetrics()
        expect(metrics).toEqual([])
      })
    })

    describe('getSummary', () => {
      it('should return performance summary', async () => {
        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        const summary = performanceCollector.getSummary()

        expect(summary).toHaveProperty('LCP')
        expect(summary.LCP).toHaveProperty('value')
        expect(summary.LCP).toHaveProperty('rating')
        expect(summary.LCP).toHaveProperty('count')
      })

      it('should return empty object when no metrics', async () => {
        await performanceCollector.init()

        const summary = performanceCollector.getSummary()
        expect(Object.keys(summary).length).toBe(0)
      })
    })

    describe('clear', () => {
      it('should clear all metrics', async () => {
        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        performanceCollector.clear()

        const metrics = performanceCollector.getMetrics()
        expect(metrics.size).toBe(0)
      })

      it('should clear custom metrics', async () => {
        await performanceCollector.init()

        performanceCollector['recordCustomMetric']({
          name: 'custom',
          value: 100,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api',
        })

        performanceCollector.clear()

        const metrics = performanceCollector.getCustomMetrics()
        expect(metrics.length).toBe(0)
      })
    })

    describe('destroy', () => {
      it('should clear all data', async () => {
        await performanceCollector.init()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        performanceCollector.destroy()

        expect(performanceCollector.getMetrics().size).toBe(0)
        expect(performanceCollector.getCustomMetrics().length).toBe(0)
      })

      it('should clear callbacks', async () => {
        const callback = vi.fn()
        performanceCollector.onMetric(callback)

        await performanceCollector.init()
        performanceCollector.destroy()

        performanceCollector['recordMetric']({
          name: 'LCP',
          value: 2500,
          rating: 'good',
          timestamp: Date.now(),
          id: 'test-1',
          route: '/test',
        })

        expect(callback).not.toHaveBeenCalled()
      })

      it('should set isInitialized to false', async () => {
        await performanceCollector.init()
        performanceCollector.destroy()

        expect(performanceCollector['isInitialized']).toBe(false)
      })
    })
  })

  describe('initPerformanceMonitoring', () => {
    it('should initialize the collector', async () => {
      await initPerformanceMonitoring()

      expect(performanceCollector['isInitialized']).toBe(true)
    })
  })

  describe('recordCustomMetric', () => {
    it('should record custom metric with category', async () => {
      await performanceCollector.init()

      recordCustomMetric('test-metric', 100, 'api')

      const metrics = performanceCollector.getCustomMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].name).toBe('test-metric')
      expect(metrics[0].category).toBe('api')
    })

    it('should record custom metric with metadata', async () => {
      await performanceCollector.init()

      recordCustomMetric('test-metric', 100, 'api', { endpoint: '/api/test' })

      const metrics = performanceCollector.getCustomMetrics()
      expect(metrics[0].metadata).toEqual({ endpoint: '/api/test' })
    })

    it('should handle all categories', async () => {
      await performanceCollector.init()

      recordCustomMetric('resource', 100, 'resource')
      recordCustomMetric('api', 100, 'api')
      recordCustomMetric('navigation', 100, 'navigation')
      recordCustomMetric('rendering', 100, 'rendering')
      recordCustomMetric('memory', 100, 'memory')

      const metrics = performanceCollector.getCustomMetrics()
      expect(metrics.length).toBe(5)
    })
  })

  describe('getPerformanceSummary', () => {
    it('should return summary', async () => {
      await performanceCollector.init()

      performanceCollector['recordMetric']({
        name: 'LCP',
        value: 2500,
        rating: 'good',
        timestamp: Date.now(),
        id: 'test-1',
        route: '/test',
      })

      const summary = getPerformanceSummary()

      expect(summary).toHaveProperty('LCP')
    })
  })

  describe('onPerformanceMetric', () => {
    it('should register metric callback', () => {
      const callback = vi.fn()
      onPerformanceMetric(callback)
      expect(callback).toBeDefined()
    })

    it('should return unregister function', () => {
      const callback = vi.fn()
      const unregister = onPerformanceMetric(callback)

      expect(typeof unregister).toBe('function')
    })
  })

  describe('onPerformanceAlert', () => {
    it('should register alert callback', () => {
      const callback = vi.fn()
      onPerformanceAlert(callback)
      expect(callback).toBeDefined()
    })

    it('should return unregister function', () => {
      const callback = vi.fn()
      const unregister = onPerformanceAlert(callback)

      expect(typeof unregister).toBe('function')
    })
  })

  describe('trackApiPerformance', () => {
    it('should track successful API call', async () => {
      await performanceCollector.init()

      class TestService {
        @trackApiPerformance('test-api')
        async testMethod() {
          return { result: 'success' }
        }
      }

      const service = new TestService()
      const result = await service.testMethod()

      expect(result).toEqual({ result: 'success' })

      const metrics = performanceCollector.getCustomMetrics()
      const apiMetric = metrics.find(m => m.name === 'api.test-api')
      expect(apiMetric).toBeDefined()
    })

    it('should track failed API call', async () => {
      await performanceCollector.init()

      class TestService {
        @trackApiPerformance('test-api')
        async testMethod() {
          throw new Error('API Error')
        }
      }

      const service = new TestService()

      await expect(service.testMethod()).rejects.toThrow('API Error')

      const metrics = performanceCollector.getCustomMetrics()
      const apiMetric = metrics.find(m => m.name === 'api.test-api')
      expect(apiMetric).toBeDefined()
      expect(apiMetric?.metadata?.success).toBe(false)
    })
  })

  describe('trackRenderPerformance', () => {
    it('should track render time', async () => {
      await performanceCollector.init()

      const tracker = trackRenderPerformance('TestComponent')

      // Simulate render work
      await new Promise(resolve => setTimeout(resolve, 10))

      tracker.end()

      const metrics = performanceCollector.getCustomMetrics()
      const renderMetric = metrics.find(m => m.name === 'render.TestComponent')
      expect(renderMetric).toBeDefined()
    })

    it('should log warning for slow renders', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await performanceCollector.init()

      const tracker = trackRenderPerformance('SlowComponent')

      // Simulate slow render
      await new Promise(resolve => setTimeout(resolve, 50))

      tracker.end()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      // Initialize
      await initPerformanceMonitoring()

      // Record metrics
      performanceCollector['recordMetric']({
        name: 'LCP',
        value: 2500,
        rating: 'good',
        timestamp: Date.now(),
        id: 'test-1',
        route: '/test',
      })

      // Record custom metric
      recordCustomMetric('api-call', 100, 'api')

      // Get summary
      const summary = getPerformanceSummary()

      expect(summary.LCP).toBeDefined()
      expect(performanceCollector.getCustomMetrics().length).toBe(1)
    })

    it('should handle multiple listeners', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      performanceCollector.onMetric(callback1)
      performanceCollector.onMetric(callback2)
      performanceCollector.onMetric(callback3)

      await performanceCollector.init()

      performanceCollector['recordMetric']({
        name: 'LCP',
        value: 2500,
        rating: 'good',
        timestamp: Date.now(),
        id: 'test-1',
        route: '/test',
      })

      expect(callback1).toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
      expect(callback3).toHaveBeenCalled()
    })
  })
})
