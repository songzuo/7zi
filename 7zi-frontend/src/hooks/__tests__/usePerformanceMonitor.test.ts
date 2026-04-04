/**
 * usePerformanceMonitor Hook Tests
 * 性能监控自定义 Hook 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePerformanceMonitor, usePerformanceMetrics } from '@/hooks/usePerformanceMonitor'

// Mock the monitoring module - must be hoisted to top
vi.mock('@/lib/monitoring', () => {
  const mockGetAggregatedMetrics = vi.fn()
  const mockGetAlarms = vi.fn()
  const mockUpdateConfig = vi.fn()

  return {
    monitor: {
      getAggregatedMetrics: mockGetAggregatedMetrics,
      getAlarms: mockGetAlarms,
      updateConfig: mockUpdateConfig,
    },
  }
})

// Define mock data after mock setup
const mockAggregatedMetrics = {
  apiMetrics: {
    totalRequests: 1250,
    averageResponseTime: 450,
    successRate: 0.98,
    errorCount: 25,
    errorRate: 0.02,
  },
  operationMetrics: {
    totalOperations: 890,
    averageDuration: 1200,
    successRate: 0.97,
  },
  errorMetrics: {
    totalErrors: 25,
    errorsByType: {
      network: 10,
      timeout: 8,
      server: 7,
    },
  },
  timeWindow: {
    start: Date.now() - 300000,
    end: Date.now(),
  },
}

const mockAlarms = [
  {
    id: 'alarm-1',
    timestamp: Date.now() - 60000,
    type: 'errorRate' as const,
    currentValue: 0.15,
    threshold: 0.1,
    message: 'Error rate exceeds threshold',
    severity: 'high' as const,
  },
]

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    expect(result.current.aggregatedData).toBeNull()
    expect(result.current.recentAlarms).toEqual([])
    expect(result.current.resourceData).toEqual([])
    expect(result.current.isRefreshing).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('fetches initial data on mount', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(result.current.aggregatedData).toEqual(mockAggregatedMetrics)
      expect(result.current.isRefreshing).toBe(false)
    })
  })

  it('fetches alarms on mount', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(monitor.getAlarms).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(result.current.recentAlarms).toHaveLength(1)
    })
  })

  it('generates resource data on mount', async () => {
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.resourceData).toHaveLength(24)
    })
  })

  it('updates last update timestamp', async () => {
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.lastUpdate).toBeInstanceOf(Date)
    })
  })

  it('supports manual refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.aggregatedData).not.toBeNull()
    })

    const callCountBefore = vi.mocked(monitor.getAggregatedMetrics).mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(vi.mocked(monitor.getAggregatedMetrics).mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  it('sets isRefreshing during refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.aggregatedData).not.toBeNull()
    })

    // Mock a slow refresh
    vi.mocked(monitor.getAggregatedMetrics).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAggregatedMetrics), 100))
    )

    act(() => {
      result.current.refresh()
    })

    expect(result.current.isRefreshing).toBe(true)

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false)
    })
  })

  it('handles errors during refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    vi.mocked(monitor.getAggregatedMetrics).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  it('auto-refreshes when enabled', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const refreshInterval = 5000

    renderHook(() => usePerformanceMonitor({ autoRefresh: true, refreshInterval }))

    // Initial call
    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledTimes(1)
    })

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(refreshInterval)
    })

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledTimes(2)
    })
  })

  it('does not auto-refresh when disabled', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const refreshInterval = 5000

    renderHook(() => usePerformanceMonitor({ autoRefresh: false, refreshInterval }))

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledTimes(1)
    })

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(refreshInterval * 2)
    })

    // Should still be called only once (initial load)
    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledTimes(1)
    })
  })

  it('cleans up interval on unmount', async () => {
    const { unmount } = renderHook(() => usePerformanceMonitor({ autoRefresh: true, refreshInterval: 5000 }))

    await waitFor(() => {
      expect(screen.queryByText('CPU 使用率')).not.toBeInTheDocument()
    })

    unmount()

    // Fast-forward time - should not cause errors
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should not crash
    expect(true).toBe(true)
  })

  it('uses default refresh interval', async () => {
    const { monitor } = await import('@/lib/monitoring')
    renderHook(() => usePerformanceMonitor({ autoRefresh: true }))

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalled()
    })

    // Default interval is 30000ms
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledTimes(2)
    })
  })

  it('uses custom time range', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const customTimeRange = 60000

    renderHook(() => usePerformanceMonitor({
      autoRefresh: false,
      initialTimeRange: customTimeRange,
    }))

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalledWith(customTimeRange)
      expect(monitor.getAlarms).toHaveBeenCalledWith(
        expect.any(Number) // Should be now - timeRange
      )
    })
  })

  it('handles component unmount during refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    vi.mocked(monitor.getAggregatedMetrics).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockAggregatedMetrics), 1000))
    )

    const { unmount } = renderHook(() => usePerformanceMonitor({ autoRefresh: false }))

    // Unmount before refresh completes
    unmount()

    // Wait for the timeout to complete
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should not crash
    expect(true).toBe(true)
  })
})

describe('usePerformanceMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('provides simplified interface', async () => {
    const { result } = renderHook(() => usePerformanceMetrics({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined()
      expect(result.current.isRefreshing).toBeDefined()
      expect(result.current.lastUpdate).toBeDefined()
      expect(result.current.refresh).toBeDefined()
      expect(result.current.error).toBeDefined()
    })
  })

  it('fetches metrics on mount', async () => {
    const { result } = renderHook(() => usePerformanceMetrics({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockAggregatedMetrics)
    })
  })

  it('does not include resource data', async () => {
    const { result } = renderHook(() => usePerformanceMetrics({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockAggregatedMetrics)
      // resourceData should not be available in this simplified hook
      expect('resourceData' in result.current).toBe(false)
    })
  })

  it('supports auto-refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const refreshInterval = 5000

    renderHook(() => usePerformanceMetrics({ autoRefresh: true, refreshInterval }))

    await waitFor(() => {
      expect(monitor.getAggregatedMetrics).toHaveBeenCalled()
    })
  })

  it('supports manual refresh', async () => {
    const { monitor } = await import('@/lib/monitoring')
    const { result } = renderHook(() => usePerformanceMetrics({ autoRefresh: false }))

    await waitFor(() => {
      expect(result.current.metrics).not.toBeNull()
    })

    const callCountBefore = vi.mocked(monitor.getAggregatedMetrics).mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    await waitFor(() => {
      expect(vi.mocked(monitor.getAggregatedMetrics).mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })
})
