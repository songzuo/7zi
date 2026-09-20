'use client'

import { useEffect, useState, useMemo } from 'react'
import { useDarkMode } from '@/stores/preferencesStore'
import { performanceCollector } from '@/lib/monitoring/performance.monitor'
import { useRealtimeNotificationStore } from '@/lib/realtime/store'

// ============================================================================
// Types
// ============================================================================

interface HealthMetric {
  label: string
  value: string
  status: 'healthy' | 'warning' | 'critical'
  trend?: 'up' | 'down' | 'stable'
}

interface HealthDashboardProps {
  className?: string
  refreshInterval?: number // in milliseconds
}

// ============================================================================
// Component
// ============================================================================

/**
 * Health Dashboard Component
 *
 * Displays system health status metrics including:
 * - API Response Time
 * - WebSocket Connection Status
 * - Memory Usage
 * - Last Active Time
 *
 * Features:
 * - Real-time monitoring with configurable refresh interval
 * - Responsive design for all screen sizes
 * - Dark/light theme support
 * - Visual status indicators
 */
export function HealthDashboard({ className = '', refreshInterval = 5000 }: HealthDashboardProps) {
  const isDark = useDarkMode()
  const { isConnected } = useRealtimeNotificationStore()

  const [apiLatency, setApiLatency] = useState<number>(0)
  const [memoryUsage, setMemoryUsage] = useState<number>(0)
  const [lastActive, setLastActive] = useState<string>(new Date().toISOString())
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Single combined useEffect for both data fetching
  useEffect(() => {
    const fetchData = () => {
      // Fetch API latency
      const metrics = performanceCollector.getMetrics()
      const apiMetrics = metrics.get('TTFB')

      if (apiMetrics && apiMetrics.length > 0) {
        const latest = apiMetrics[apiMetrics.length - 1]
        setApiLatency(latest.value)
      }

      // Update last active time
      setLastActive(new Date().toISOString())
      setLastUpdate(new Date())

      // Fetch memory usage with enhanced safety checks
      try {
        if (typeof performance === 'undefined') {
          setMemoryUsage(0)
          return
        }

        const perf = performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
        }

        if (!perf.memory || typeof perf.memory.usedJSHeapSize !== 'number') {
          setMemoryUsage(0)
          return
        }

        const usedMB = perf.memory.usedJSHeapSize / (1024 * 1024)
        setMemoryUsage(usedMB)
      } catch (error) {
        // Silently fail on memory access errors
        setMemoryUsage(0)
      }
    }

    // Initial fetch
    fetchData()

    // Set up interval
    const interval = setInterval(fetchData, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  // Calculate health metrics - memoized to prevent recalculation on every render
  const metrics: HealthMetric[] = useMemo(
    () => [
      {
        label: 'API Response Time',
        value: `${apiLatency.toFixed(0)}ms`,
        status: apiLatency < 200 ? 'healthy' : apiLatency < 500 ? 'warning' : 'critical',
        trend: apiLatency > 0 ? 'stable' : undefined,
      },
      {
        label: 'WebSocket Connection',
        value: isConnected ? 'Connected' : 'Disconnected',
        status: isConnected ? 'healthy' : 'critical',
      },
      {
        label: 'Memory Usage',
        value: `${memoryUsage.toFixed(1)}MB`,
        status: memoryUsage < 100 ? 'healthy' : memoryUsage < 200 ? 'warning' : 'critical',
      },
      {
        label: 'Last Active',
        value: formatTimeSince(lastActive),
        status: 'healthy',
      },
    ],
    [apiLatency, isConnected, memoryUsage, lastActive]
  )

  return (
    <div className={`rounded-xl bg-white p-6 shadow-lg dark:bg-zinc-800 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-2xl">🏥</span>
          <span className={isDark ? 'text-white' : 'text-zinc-900'}>Health Dashboard</span>
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <MetricCard key={metric.label} metric={metric} isDark={isDark} />
        ))}
      </div>

      {/* Overall Status */}
      <OverallStatus metrics={metrics} isDark={isDark} />
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

interface MetricCardProps {
  metric: HealthMetric
  isDark: boolean
}

function MetricCard({ metric, isDark }: MetricCardProps) {
  // Memoize statusConfig to prevent object recreation on every render
  const statusConfig = useMemo(
    () => ({
      healthy: {
        color: 'bg-emerald-500',
        bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
        textColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
        icon: '✓',
      },
      warning: {
        color: 'bg-amber-500',
        bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
        textColor: isDark ? 'text-amber-400' : 'text-amber-600',
        icon: '⚠',
      },
      critical: {
        color: 'bg-red-500',
        bgColor: isDark ? 'bg-red-500/10' : 'bg-red-50',
        textColor: isDark ? 'text-red-400' : 'text-red-600',
        icon: '✗',
      },
    }),
    [isDark]
  )

  const config = statusConfig[metric.status]

  return (
    <div className={`rounded-lg p-4 ${config.bgColor} border border-zinc-200 dark:border-zinc-700`}>
      {/* Status Indicator */}
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-xs font-medium ${config.textColor} tracking-wider uppercase`}>
          {metric.status}
        </span>
        <div className={`h-2 w-2 rounded-full ${config.color} animate-pulse`} />
      </div>

      {/* Value */}
      <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
        {metric.value}
      </div>

      {/* Label */}
      <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'} mt-1`}>
        {metric.label}
      </div>

      {/* Trend */}
      {metric.trend && (
        <div className="mt-2 text-xs text-zinc-500">
          {metric.trend === 'up' && '↑ Increasing'}
          {metric.trend === 'down' && '↓ Decreasing'}
          {metric.trend === 'stable' && '→ Stable'}
        </div>
      )}
    </div>
  )
}

interface OverallStatusProps {
  metrics: HealthMetric[]
  isDark: boolean
}

function OverallStatus({ metrics, isDark }: OverallStatusProps) {
  const healthyCount = metrics.filter(m => m.status === 'healthy').length
  const warningCount = metrics.filter(m => m.status === 'warning').length
  const criticalCount = metrics.filter(m => m.status === 'critical').length

  const overallStatus = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy'

  const statusConfig = {
    healthy: {
      color: 'bg-emerald-500',
      text: 'System Healthy',
      description: 'All systems are operating normally',
    },
    warning: {
      color: 'bg-amber-500',
      text: 'System Degraded',
      description: 'Some metrics need attention',
    },
    critical: {
      color: 'bg-red-500',
      text: 'System Critical',
      description: 'Immediate action required',
    },
  }

  const config = statusConfig[overallStatus]

  return (
    <div className={`mt-6 rounded-lg p-4 ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'}`}>
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${config.color}`} />
        <div>
          <div className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {config.text}
          </div>
          <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {config.description} ({healthyCount} healthy, {warningCount} warnings, {criticalCount}{' '}
            critical)
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time since a given timestamp
 */
const formatTimeSince = (timestamp: string): string => {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return `${diffSecs}s ago`
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type { HealthMetric, HealthDashboardProps }
