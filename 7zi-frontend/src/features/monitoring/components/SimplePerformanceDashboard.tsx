'use client'

/**
 * Simple Performance Dashboard Component
 * 简化的性能监控仪表板组件（无需外部图表库）
 */

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Clock, Zap, Activity, RefreshCw, Trash2 } from 'lucide-react'
import { monitor, AggregatedMetrics, AlarmEvent } from '@/lib/monitoring'

interface SimplePerformanceDashboardProps {
  refreshInterval?: number
  showAlarms?: boolean
  className?: string
}

export function SimplePerformanceDashboard({
  refreshInterval = 5000,
  showAlarms = true,
  className = '',
}: SimplePerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [alarms, setAlarms] = useState<AlarmEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    const interval = setInterval(loadMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadMetrics = async () => {
    try {
      const [metricsData, alarmsData] = await Promise.all([
        monitor.getAggregatedMetrics(5 * 60 * 1000),
        monitor.getAlarms(Date.now() - 60 * 60 * 1000),
      ])
      setMetrics(metricsData)
      setAlarms(alarmsData)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearData = async () => {
    if (confirm('Clear all monitoring data?')) {
      await monitor.clearAllData()
      loadMetrics()
    }
  }

  const formatPercent = (num: number): string => `${(num * 100).toFixed(2)}%`
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const activeAlarms = alarms.filter(a => a.severity === 'critical' || a.severity === 'high')

  if (isLoading && !metrics) {
    return (
      <div className={`rounded-2xl bg-zinc-900 p-6 dark:bg-zinc-950 ${className}`}>
        <div className="flex h-32 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 rounded-2xl bg-zinc-900 p-6 dark:bg-zinc-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-zinc-100 dark:text-zinc-100">
            Performance Monitor
          </h2>
          {activeAlarms.length > 0 && (
            <div className="flex items-center space-x-1 rounded-full bg-red-500/20 px-2 py-1 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{activeAlarms.length} Alarms</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClearData}
          className="rounded-2xl p-2 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-900"
        >
          <Trash2 className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
        </button>
      </div>

      {/* Alarms */}
      {showAlarms && activeAlarms.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 dark:border-red-500/40 dark:bg-red-500/20">
          <h3 className="mb-2 text-sm font-semibold text-red-400 dark:text-red-300">
            Active Alarms
          </h3>
          {activeAlarms.slice(0, 3).map(alarm => (
            <div key={alarm.id} className="py-1 text-sm text-zinc-300 dark:text-zinc-400">
              • {alarm.message}
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* API */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">
                API Requests
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="font-bold text-zinc-100 dark:text-zinc-100">
                  {metrics.apiMetrics.totalRequests}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Avg Time</span>
                <span className="text-zinc-100 dark:text-zinc-100">
                  {formatDuration(metrics.apiMetrics.averageResponseTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Success</span>
                <span className="text-green-400">
                  {formatPercent(metrics.apiMetrics.successRate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Errors</span>
                <span
                  className={
                    metrics.apiMetrics.errorRate > 0.05
                      ? 'text-red-400'
                      : 'text-zinc-300 dark:text-zinc-400'
                  }
                >
                  {formatPercent(metrics.apiMetrics.errorRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">
                Operations
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="font-bold text-zinc-100 dark:text-zinc-100">
                  {metrics.operationMetrics.totalOperations}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Avg Time</span>
                <span className="text-zinc-100 dark:text-zinc-100">
                  {formatDuration(metrics.operationMetrics.averageDuration)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Success</span>
                <span className="text-green-400">
                  {formatPercent(metrics.operationMetrics.successRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-2 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">Errors</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="font-bold text-zinc-100 dark:text-zinc-100">
                  {metrics.errorMetrics.totalErrors}
                </span>
              </div>
              {Object.entries(metrics.errorMetrics.errorsByType)
                .slice(0, 3)
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="truncate text-zinc-400 dark:text-zinc-500">{type}</span>
                    <span className="text-zinc-300 dark:text-zinc-400">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-600">
        <span>Time window: 5 minutes</span>
        {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
      </div>
    </div>
  )
}
