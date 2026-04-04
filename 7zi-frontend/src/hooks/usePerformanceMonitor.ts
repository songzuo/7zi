/**
 * usePerformanceMonitor - 性能监控自定义 Hook
 *
 * 提供性能监控数据的自动刷新和管理功能。
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { monitor } from '@/lib/monitoring'
import type { AggregatedMetrics, AlarmEvent } from '@/lib/monitoring/types'
import type { ResourceUsageData } from '@/lib/analytics/types'

export interface UsePerformanceMonitorOptions {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  initialTimeRange?: number // in milliseconds
}

export interface UsePerformanceMonitorReturn {
  aggregatedData: AggregatedMetrics | null
  recentAlarms: AlarmEvent[]
  resourceData: ResourceUsageData[]
  isRefreshing: boolean
  lastUpdate: Date | null
  refresh: () => Promise<void>
  error: Error | null
}

export function usePerformanceMonitor({
  autoRefresh = true,
  refreshInterval = 30000,
  initialTimeRange = 30 * 60 * 1000,
}: UsePerformanceMonitorOptions = {}): UsePerformanceMonitorReturn {
  const [aggregatedData, setAggregatedData] = useState<AggregatedMetrics | null>(null)
  const [recentAlarms, setRecentAlarms] = useState<AlarmEvent[]>([])
  const [resourceData, setResourceData] = useState<ResourceUsageData[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [timeRange, setTimeRange] = useState(initialTimeRange)

  const mountedRef = useRef(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Generate mock resource usage data
   * Note: In production, this would come from a real API endpoint
   */
  const generateMockResourceData = useCallback((): ResourceUsageData[] => {
    const data: ResourceUsageData[] = []
    const now = Date.now()

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now - (23 - i) * timeRange / 24).toISOString()
      data.push({
        timestamp,
        cpuUsage: 35 + Math.random() * 45,
        memoryUsage: 45 + Math.random() * 40,
        diskUsage: 50 + Math.random() * 20,
        networkUsage: 20 + Math.random() * 50,
      })
    }

    return data
  }, [timeRange])

  /**
   * Fetch monitoring data
   */
  const refresh = useCallback(async () => {
    if (!mountedRef.current) return

    setIsRefreshing(true)
    setError(null)

    try {
      // Fetch aggregated metrics
      const aggregated = await monitor.getAggregatedMetrics(timeRange)
      if (mountedRef.current) {
        setAggregatedData(aggregated)
      }

      // Fetch alarms
      const alarms = await monitor.getAlarms(Date.now() - timeRange)
      if (mountedRef.current) {
        setRecentAlarms(alarms.slice(-20).reverse())
      }

      // Generate resource data (mock)
      const resource = generateMockResourceData()
      if (mountedRef.current) {
        setResourceData(resource)
      }

      if (mountedRef.current) {
        setLastUpdate(new Date())
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch monitoring data'))
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [timeRange, generateMockResourceData])

  /**
   * Update time range
   */
  const updateTimeRange = useCallback((newTimeRange: number) => {
    setTimeRange(newTimeRange)
  }, [])

  /**
   * Initial fetch
   */
  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Auto-refresh interval
   */
  useEffect(() => {
    if (!autoRefresh) return

    intervalRef.current = setInterval(() => {
      refresh()
    }, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    aggregatedData,
    recentAlarms,
    resourceData,
    isRefreshing,
    lastUpdate,
    refresh,
    error,
  }
}

/**
 * Simplified hook for just metrics (no charts)
 */
export function usePerformanceMetrics({
  autoRefresh = true,
  refreshInterval = 30000,
  timeRange = 30 * 60 * 1000,
}: UsePerformanceMonitorOptions = {}) {
  const {
    aggregatedData,
    isRefreshing,
    lastUpdate,
    refresh,
    error,
  } = usePerformanceMonitor({
    autoRefresh,
    refreshInterval,
    initialTimeRange: timeRange,
  })

  return {
    metrics: aggregatedData,
    isRefreshing,
    lastUpdate,
    refresh,
    error,
  }
}

export default usePerformanceMonitor
