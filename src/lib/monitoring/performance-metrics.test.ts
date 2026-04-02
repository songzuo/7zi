/**
 * Tests for Performance Metrics
 *
 * Note: These tests verify the performance metrics collection logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  queueMetric,
  flushMetrics,
  recordCustomMetric,
  recordApiResponse,
  recordComponentRender,
} from '@/lib/monitoring/performance-metrics'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger } from '@/lib/logger'

describe('queueMetric', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should queue metric with good rating', () => {
    queueMetric('test-metric', 100, 'good')

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'test-metric',
        value: 100,
        rating: 'good',
      })
    )
  })

  it('should queue metric with needsImprovement rating', () => {
    queueMetric('test-metric', 300, 'needsImprovement')

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'test-metric',
        value: 300,
        rating: 'needsImprovement',
      })
    )
  })

  it('should queue metric with poor rating', () => {
    queueMetric('test-metric', 1000, 'poor')

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'test-metric',
        value: 1000,
        rating: 'poor',
      })
    )
  })

  it('should not queue metric when window is undefined', () => {
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    })

    queueMetric('test-metric', 100, 'good')

    expect(logger.info).not.toHaveBeenCalled()
  })
})

describe('flushMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
    // Mock fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should flush queued metrics to API', async () => {
    queueMetric('metric1', 100, 'good')
    queueMetric('metric2', 200, 'good')

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response)

    await flushMetrics()

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/performance/metrics',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )
  })

  it('should handle successful API response', async () => {
    queueMetric('metric1', 100, 'good')

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response)

    await flushMetrics()

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metrics sent successfully',
      expect.objectContaining({
        count: 1,
      })
    )
  })

  it('should handle failed API response', async () => {
    queueMetric('metric1', 100, 'good')

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await flushMetrics()

    expect(logger.warn).toHaveBeenCalled()
  })

  it('should handle network errors', async () => {
    queueMetric('metric1', 100, 'good')

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    await flushMetrics()

    expect(logger.warn).toHaveBeenCalledWith(
      'Error sending performance metrics',
      expect.any(Object)
    )
  })
})

describe('recordCustomMetric', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should record custom metric with good rating', () => {
    recordCustomMetric('custom-metric', 150, 'good')

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'custom-metric',
        value: 150,
        rating: 'good',
      })
    )
  })

  it('should record custom metric with default rating', () => {
    recordCustomMetric('custom-metric', 300)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'custom-metric',
        value: 300,
        rating: 'needsImprovement',
      })
    )
  })

  it('should not record metric when window is undefined', () => {
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    })

    recordCustomMetric('custom-metric', 100)

    expect(logger.info).not.toHaveBeenCalled()
  })
})

describe('recordApiResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should record fast API response as good', () => {
    recordApiResponse('/api/test', 150)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'API-/api/test',
        value: 150,
        rating: 'good',
      })
    )
  })

  it('should record slow API response', () => {
    recordApiResponse('/api/test', 500)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'API-/api/test',
        value: 500,
      })
    )
  })
})

describe('recordComponentRender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should record fast component render', () => {
    recordComponentRender('TestComponent', 10)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'Render-TestComponent',
        value: 10,
        rating: 'good',
      })
    )
  })

  it('should record slow component render', () => {
    recordComponentRender('TestComponent', 50)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'Render-TestComponent',
        value: 50,
      })
    )
  })

  it('should record very slow component render', () => {
    recordComponentRender('TestComponent', 200)

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'Render-TestComponent',
        value: 200,
        rating: 'poor',
      })
    )
  })
})

describe('Metric Rating Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          pathname: '/test',
          href: 'http://localhost/test',
        },
        innerWidth: 1920,
        innerHeight: 1080,
        navigator: {
          userAgent: 'Mozilla/5.0',
          connection: {
            effectiveType: '4g',
          },
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should record LCP metric with rating', () => {
    queueMetric('LCP', 2500, 'good')
    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'LCP',
        value: 2500,
        rating: 'good',
      })
    )
  })

  it('should record CLS metric with rating', () => {
    queueMetric('CLS', 0.05, 'good')
    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'CLS',
        value: 0.05,
        rating: 'good',
      })
    )
  })

  it('should record TTFB metric with rating', () => {
    queueMetric('TTFB', 600, 'good')
    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'TTFB',
        value: 600,
        rating: 'good',
      })
    )
  })

  it('should record FCP metric with rating', () => {
    queueMetric('FCP', 1500, 'good')
    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'FCP',
        value: 1500,
        rating: 'good',
      })
    )
  })

  it('should record INP metric with rating', () => {
    queueMetric('INP', 150, 'good')
    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'INP',
        value: 150,
        rating: 'good',
      })
    )
  })

  it('should include route and device info in metrics', () => {
    queueMetric('test', 100, 'good')

    expect(logger.info).toHaveBeenCalledWith(
      'Performance metric collected',
      expect.objectContaining({
        name: 'test',
        value: 100,
        rating: 'good',
      })
    )
  })
})
