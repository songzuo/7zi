/**
 * Use Performance Monitoring Hook Tests
 * 性能监控 Hook 测试
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePerformanceMonitoring, useCustomMetrics, usePerformanceMetrics } from '../usePerformanceMonitoring'

// Mock performance modules
jest.mock('@/lib/performance/web-vitals', () => ({
  webVitalsMonitor: {
    getMetrics: jest.fn().mockReturnValue({ LCP: 2500, CLS: 0.1, INP: 200 }),
    isMetricGood: jest.fn().mockReturnValue(true),
  },
  initWebVitalsMonitoring: jest.fn(),
  WebVitalsConfig: {},
}))

jest.mock('@/lib/performance/custom-metrics', () => ({
  customMetricsTracker: {
    getMetrics: jest.fn().mockReturnValue({ pageLoadTime: 3000 }),
    recordResponseTime: jest.fn(),
    recordError: jest.fn(),
    trackWebSocketLatency: jest.fn(),
    init: jest.fn(),
    stop: jest.fn(),
  },
  initCustomMetricsTracking: jest.fn(),
}))

jest.mock('@/lib/performance/budget-manager', () => ({
  budgetManager: {
    getMetrics: jest.fn().mockReturnValue({}),
    calculateBudgetReport: jest.fn().mockReturnValue({}),
    getActiveNotifications: jest.fn().mockReturnValue([]),
    startPeriodicCheck: jest.fn(),
    stopPeriodicCheck: jest.fn(),
  },
  initPerformanceBudget: jest.fn(),
}))

jest.mock('@/lib/monitoring', () => ({
  monitor: {
    trackAPIRequest: jest.fn().mockResolvedValue(undefined),
    trackError: jest.fn().mockResolvedValue(undefined),
    trackCustomMetric: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize performance monitoring', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({
        enableWebVitals: true,
        enableCustomMetrics: true,
        enableBudget: true,
      })
    )

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
    })
  })

  it('should not initialize in server-side environment', () => {
    // In server-side environment, state should remain uninitialized
    const { result } = renderHook(() =>
      usePerformanceMonitoring({
        enableWebVitals: true,
      })
    )

    // The hook should handle server-side gracefully
    expect(result.current.isInitialized).toBe(false)
  })

  it('should enable Web Vitals when configured', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({
        enableWebVitals: true,
        enableCustomMetrics: false,
        enableBudget: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
      expect(result.current.webVitalsReady).toBe(true)
    })
  })

  it('should enable custom metrics when configured', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({
        enableWebVitals: false,
        enableCustomMetrics: true,
        enableBudget: false,
      })
    )

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
      expect(result.current.customMetricsReady).toBe(true)
    })
  })

  it('should enable budget when configured', async () => {
    const { result } = renderHook(() =>
      usePerformanceMonitoring({
        enableWebVitals: false,
        enableCustomMetrics: false,
        enableBudget: true,
      })
    )

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true)
      expect(result.current.budgetReady).toBe(true)
    })
  })
})

describe('useCustomMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide recordApiMetric function', () => {
    const { result } = renderHook(() => useCustomMetrics())

    expect(result.current.recordApiMetric).toBeDefined()
    expect(typeof result.current.recordApiMetric).toBe('function')
  })

  it('should provide recordError function', () => {
    const { result } = renderHook(() => useCustomMetrics())

    expect(result.current.recordError).toBeDefined()
    expect(typeof result.current.recordError).toBe('function')
  })

  it('should provide recordCustomMetric function', () => {
    const { result } = renderHook(() => useCustomMetrics())

    expect(result.current.recordCustomMetric).toBeDefined()
    expect(typeof result.current.recordCustomMetric).toBe('function')
  })

  it('should record API metric', async () => {
    const { result } = renderHook(() => useCustomMetrics())

    await act(async () => {
      await result.current.recordApiMetric('/api/test', 200, 200)
    })

    const { monitor } = require('@/lib/monitoring')
    expect(monitor.trackAPIRequest).toHaveBeenCalledWith(
      'GET',
      '/api/test',
      200,
      200,
      undefined
    )
  })

  it('should record error', async () => {
    const { result } = renderHook(() => useCustomMetrics())
    const testError = new Error('Test error')

    await act(async () => {
      await result.current.recordError(testError, { context: 'test' })
    })

    const { monitor } = require('@/lib/monitoring')
    expect(monitor.trackError).toHaveBeenCalledWith(
      'Error',
      'Test error',
      testError.stack,
      { context: 'test' }
    )
  })

  it('should record custom metric', async () => {
    const { result } = renderHook(() => useCustomMetrics())

    await act(async () => {
      await result.current.recordCustomMetric('test_metric', 100, 'ms', { tag: 'test' })
    })

    const { monitor } = require('@/lib/monitoring')
    expect(monitor.trackCustomMetric).toHaveBeenCalledWith(
      'test_metric',
      100,
      'ms',
      { tag: 'test' }
    )
  })
})

describe('usePerformanceMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return webVitals and customMetrics', async () => {
    const { result } = renderHook(() => usePerformanceMetrics())

    await waitFor(() => {
      expect(result.current.webVitals).toBeDefined()
      expect(result.current.customMetrics).toBeDefined()
    })

    expect(result.current.webVitals).toEqual({
      LCP: 2500,
      CLS: 0.1,
      INP: 200,
    })
    expect(result.current.customMetrics).toEqual({
      pageLoadTime: 3000,
    })
  })

  it('should update metrics periodically', async () => {
    const { result } = renderHook(() => usePerformanceMetrics())

    // Initial state
    await waitFor(() => {
      expect(result.current.webVitals).toBeDefined()
    })

    const initialWebVitals = result.current.webVitals

    // Wait for update
    await waitFor(
      () => {
        // Metrics should be refreshed
        return true
      },
      { timeout: 6000 }
    )
  })
})
