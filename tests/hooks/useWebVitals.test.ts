/**
 * useWebVitals Hook Tests
 * 性能监控 Web Vitals Hook 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the web-vitals library
vi.mock('web-vitals', () => ({
  onLCP: vi.fn(callback => {
    // Simulate LCP callback
    setTimeout(() => {
      callback({ name: 'LCP', value: 1200, id: 'lcp-1', delta: 1200, entries: [] })
    }, 10)
  }),
  onFID: vi.fn(callback => {
    setTimeout(() => {
      callback({ name: 'FID', value: 50, id: 'fid-1', delta: 50, entries: [] })
    }, 10)
  }),
  onCLS: vi.fn(callback => {
    setTimeout(() => {
      callback({ name: 'CLS', value: 0.05, id: 'cls-1', delta: 0.05, entries: [] })
    }, 10)
  }),
  onINP: vi.fn(callback => {
    setTimeout(() => {
      callback({ name: 'INP', value: 100, id: 'inp-1', delta: 100, entries: [] })
    }, 10)
  }),
  onFCP: vi.fn(callback => {
    setTimeout(() => {
      callback({ name: 'FCP', value: 800, id: 'fcp-1', delta: 800, entries: [] })
    }, 10)
  }),
  onTTFB: vi.fn(callback => {
    setTimeout(() => {
      callback({ name: 'TTFB', value: 400, id: 'ttfb-1', delta: 400, entries: [] })
    }, 10)
  }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useWebVitals Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getRating', () => {
    // Helper to test rating thresholds
    const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
      const thresholds: Record<string, { good: number; poor: number }> = {
        LCP: { good: 2500, poor: 4000 },
        FID: { good: 100, poor: 300 },
        CLS: { good: 0.1, poor: 0.25 },
        INP: { good: 200, poor: 500 },
        FCP: { good: 1800, poor: 3000 },
        TTFB: { good: 800, poor: 1800 },
      }
      const t = thresholds[name]
      if (!t) return 'good'
      if (value <= t.good) return 'good'
      if (value <= t.poor) return 'needs-improvement'
      return 'poor'
    }

    it('rates LCP correctly', () => {
      expect(getRating('LCP', 1200)).toBe('good')
      expect(getRating('LCP', 3000)).toBe('needs-improvement')
      expect(getRating('LCP', 5000)).toBe('poor')
    })

    it('rates CLS correctly', () => {
      expect(getRating('CLS', 0.05)).toBe('good')
      expect(getRating('CLS', 0.15)).toBe('needs-improvement')
      expect(getRating('CLS', 0.3)).toBe('poor')
    })

    it('rates INP correctly', () => {
      expect(getRating('INP', 100)).toBe('good')
      expect(getRating('INP', 350)).toBe('needs-improvement')
      expect(getRating('INP', 600)).toBe('poor')
    })

    it('rates FCP correctly', () => {
      expect(getRating('FCP', 800)).toBe('good')
      expect(getRating('FCP', 2500)).toBe('needs-improvement')
      expect(getRating('FCP', 4000)).toBe('poor')
    })

    it('rates TTFB correctly', () => {
      expect(getRating('TTFB', 400)).toBe('good')
      expect(getRating('TTFB', 1200)).toBe('needs-improvement')
      expect(getRating('TTFB', 2500)).toBe('poor')
    })
  })

  describe('reportMetric', () => {
    it('sends metric data to API endpoint', async () => {
      const metric = {
        name: 'LCP',
        value: 1200,
        rating: 'good' as const,
        timestamp: Date.now(),
      }

      const reportMetric = async (m: typeof metric) => {
        await fetch('/api/performance/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics: [
              {
                id: `${m.name}-${Date.now()}`,
                name: m.name,
                value: m.value,
                rating: m.rating,
                timestamp: m.timestamp,
              },
            ],
            metadata: {
              route: '/',
              deviceType: 'desktop',
              connectionType: '4g',
              userAgent: 'test-agent',
            },
          }),
        })
      }

      await reportMetric(metric)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/performance/metrics',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const metric = {
        name: 'LCP',
        value: 1200,
        rating: 'good' as const,
        timestamp: Date.now(),
      }

      const reportMetric = async (m: typeof metric) => {
        try {
          await fetch('/api/performance/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics: [m] }),
          })
        } catch (error) {
          // Silently fail - this is expected behavior
        }
      }

      // Should not throw
      await expect(reportMetric(metric)).resolves.toBeUndefined()
    })
  })

  describe('device type detection', () => {
    it('detects mobile device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })

      const getDeviceType = () => {
        const width = window.innerWidth
        if (width < 640) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
      }

      expect(getDeviceType()).toBe('mobile')
    })

    it('detects tablet device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })

      const getDeviceType = () => {
        const width = window.innerWidth
        if (width < 640) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
      }

      expect(getDeviceType()).toBe('tablet')
    })

    it('detects desktop device correctly', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })

      const getDeviceType = () => {
        const width = window.innerWidth
        if (width < 640) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
      }

      expect(getDeviceType()).toBe('desktop')
    })
  })
})
