'use client'

/**
 * Enhanced Performance Dashboard Component
 * 增强型性能监控仪表板组件 - 包含 Web Vitals 和性能预算
 */

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Gauge,
  Database,
  Network,
  Cpu,
  Layout,
  MousePointer2,
} from 'lucide-react'
import { monitor, AggregatedMetrics, AlarmEvent } from '@/lib/monitoring'
import {
  webVitalsMonitor,
  customMetricsTracker,
  budgetManager,
  calculateWebVitalsScore,
  type WebVitalsMetrics,
  type CustomMetrics,
  type PerformanceBudgetReport,
  type AlarmNotification,
} from '@/lib/performance'

interface EnhancedPerformanceDashboardProps {
  refreshInterval?: number
  showAlarms?: boolean
  showBudget?: boolean
  showWebVitals?: boolean
  className?: string
}

export function EnhancedPerformanceDashboard({
  refreshInterval = 5000,
  showAlarms = true,
  showBudget = true,
  showWebVitals = true,
  className = '',
}: EnhancedPerformanceDashboardProps) {
  'use memo'
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [alarms, setAlarms] = useState<AlarmEvent[]>([])
  const [budgetAlarms, setBudgetAlarms] = useState<AlarmNotification[]>([])
  const [webVitals, setWebVitals] = useState<WebVitalsMetrics>({})
  const [customMetrics, setCustomMetrics] = useState<CustomMetrics>({})
  const [budgetReport, setBudgetReport] = useState<PerformanceBudgetReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Initialize monitoring on mount
  useEffect(() => {
    // Initialize Web Vitals monitoring
    webVitalsMonitor.init()
    // Initialize custom metrics tracking
    customMetricsTracker.init()

    // Load initial data
    loadMetrics()

    // Set up periodic check for budget alarms
    const budgetCheckInterval = setInterval(() => {
      checkBudgetAlarms()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(budgetCheckInterval)
  }, [])

  // Auto refresh
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(() => {
      loadMetrics()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const [metricsData, alarmsData] = await Promise.all([
        monitor.getAggregatedMetrics(5 * 60 * 1000),
        monitor.getAlarms(Date.now() - 60 * 60 * 1000),
      ])
      setMetrics(metricsData)
      setAlarms(alarmsData)

      // Update custom metrics
      await customMetricsTracker.updateAPIMetrics()
      await customMetricsTracker.updateErrorMetrics()

      setWebVitals(webVitalsMonitor.getMetrics())
      setCustomMetrics(customMetricsTracker.getMetrics())

      // Calculate budget report
      const report = budgetManager.calculateBudgetReport(
        webVitalsMonitor.getMetrics(),
        customMetricsTracker.getMetrics()
      )
      setBudgetReport(report)

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkBudgetAlarms = async () => {
    const triggeredAlarms = await budgetManager.checkAlarms(
      webVitalsMonitor.getMetrics(),
      customMetricsTracker.getMetrics()
    )
    if (triggeredAlarms.length > 0) {
      setBudgetAlarms([...budgetAlarms, ...triggeredAlarms])
    }
  }

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all monitoring data?')) {
      await monitor.clearAllData()
      budgetManager.clearAllNotifications()
      setBudgetAlarms([])
      loadMetrics()
    }
  }

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals)
  }

  const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${formatNumber(ms, 0)}ms`
    if (ms < 60000) return `${formatNumber(ms / 1000, 2)}s`
    return `${formatNumber(ms / 60000, 2)}m`
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getWebVitalRating = (
    name: keyof WebVitalsMetrics,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds: Record<string, number> = {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      INP: 200,
    }

    const threshold = thresholds[name]
    if (!threshold) return 'good'

    if (value <= threshold) return 'good'
    if (value <= threshold * 1.5) return 'needs-improvement'
    return 'poor'
  }

  const getWebVitalIcon = (name: string) => {
    switch (name) {
      case 'LCP':
        return Layout
      case 'FID':
        return MousePointer2
      case 'CLS':
        return Activity
      case 'INP':
        return Zap
      default:
        return Activity
    }
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-blue-500'
      default:
        return 'bg-zinc-500'
    }
  }

  if (isLoading && !metrics) {
    return (
      <div className={`rounded-lg bg-zinc-900 p-6 ${className}`}>
        <div className="flex h-32 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </div>
    )
  }

  const allActiveAlarms = [
    ...alarms.filter(a => a.severity === 'critical' || a.severity === 'high'),
    ...budgetAlarms.filter(a => !a.acknowledged),
  ]

  const webVitalsScore = calculateWebVitalsScore(webVitals)

  return (
    <div className={`space-y-6 rounded-lg bg-zinc-900 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Gauge className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-white">Performance Dashboard</h2>
          {budgetReport && (
            <div
              className={`flex items-center space-x-2 rounded-full px-3 py-1 ${
                budgetReport.status === 'pass'
                  ? 'bg-green-500/20 text-green-400'
                  : budgetReport.status === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
              }`}
            >
              <span className="text-sm font-medium">
                Score: {budgetReport.overallScore.toFixed(0)}
              </span>
            </div>
          )}
          {allActiveAlarms.length > 0 && (
            <div className="flex items-center space-x-1 rounded bg-red-500/20 px-2 py-1 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{allActiveAlarms.length} Active Alarms</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-800"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearData}
            className="rounded-lg p-2 transition-colors hover:bg-zinc-800"
            title="Clear Data"
          >
            <Trash2 className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Web Vitals Score */}
      {showWebVitals && (
        <div className="rounded-lg bg-zinc-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-200">Core Web Vitals</h3>
            <div className={`text-3xl font-bold ${getScoreColor(webVitalsScore)}`}>
              {webVitalsScore.toFixed(0)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(['LCP', 'CLS', 'INP'] as const).map(name => {
              const value = webVitals[name]
              const rating = value !== undefined ? getWebVitalRating(name, value) : null
              const Icon = getWebVitalIcon(name)

              return (
                <div key={name} className="rounded-lg bg-zinc-900 p-3">
                  <div className="mb-2 flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-zinc-400">{name}</span>
                  </div>
                  {value !== undefined ? (
                    <>
                      <div className="text-xl font-bold text-white">
                        {name === 'CLS' ? value.toFixed(3) : formatDuration(value)}
                      </div>
                      <div className="mt-1 flex items-center">
                        {rating === 'good' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : rating === 'needs-improvement' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={`ml-1 text-xs ${
                            rating === 'good'
                              ? 'text-green-400'
                              : rating === 'needs-improvement'
                                ? 'text-yellow-400'
                                : 'text-red-400'
                          }`}
                        >
                          {rating || 'N/A'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-zinc-500">N/A</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Alarms */}
      {showAlarms && allActiveAlarms.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="mb-3 text-sm font-semibold text-red-400">Active Alarms</h3>
          <div className="space-y-2">
            {allActiveAlarms.slice(0, 5).map((alarm, idx) => (
              <div
                key={`${alarm.id}-${idx}`}
                className="flex items-start space-x-3 rounded-lg border-l-4 border-red-500 bg-zinc-800 p-3"
              >
                <div className={`mt-0.5 ${getSeverityColor(alarm.severity)}`}>
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200">{alarm.message}</p>
                  <div className="mt-1 flex items-center space-x-4">
                    <span className="text-xs text-zinc-500">
                      {new Date(alarm.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs ${getSeverityColor(alarm.severity)} text-white`}
                >
                  {alarm.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* API Requests */}
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-zinc-300">API Requests</span>
              </div>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {metrics.apiMetrics.totalRequests}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Success Rate</span>
                  <span
                    className={
                      formatPercent(metrics.apiMetrics.successRate) === '100.00%'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }
                  >
                    {formatPercent(metrics.apiMetrics.successRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Avg Response</span>
                  <span className="text-white">
                    {formatDuration(metrics.apiMetrics.averageResponseTime)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Error Rate</span>
                  <span
                    className={
                      metrics.apiMetrics.errorRate > 0.05 ? 'text-red-400' : 'text-zinc-300'
                    }
                  >
                    {formatPercent(metrics.apiMetrics.errorRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-zinc-300">Operations</span>
              </div>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {metrics.operationMetrics.totalOperations}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Success Rate</span>
                  <span
                    className={
                      formatPercent(metrics.operationMetrics.successRate) === '100.00%'
                        ? 'text-green-400'
                        : 'text-yellow-400'
                    }
                  >
                    {formatPercent(metrics.operationMetrics.successRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Avg Duration</span>
                  <span className="text-white">
                    {formatDuration(metrics.operationMetrics.averageDuration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-zinc-300">Errors</span>
              </div>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {metrics.errorMetrics.totalErrors}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              {Object.keys(metrics.errorMetrics.errorsByType).length > 0 && (
                <div className="max-h-20 space-y-1 overflow-y-auto">
                  {Object.entries(metrics.errorMetrics.errorsByType)
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="truncate text-zinc-400">{type}</span>
                        <span className="text-zinc-300">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Metrics */}
      {customMetrics && Object.keys(customMetrics).length > 0 && (
        <div className="rounded-lg bg-zinc-800 p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-wider text-zinc-400 uppercase">
            Custom Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {customMetrics.pageLoadTime !== undefined && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-xs text-zinc-500">Page Load</div>
                  <div className="text-sm text-white">
                    {formatDuration(customMetrics.pageLoadTime)}
                  </div>
                </div>
              </div>
            )}
            {customMetrics.memoryUsage !== undefined && (
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-xs text-zinc-500">Memory</div>
                  <div
                    className={`text-sm ${customMetrics.memoryUsagePercent && customMetrics.memoryUsagePercent > 85 ? 'text-red-400' : 'text-white'}`}
                  >
                    {customMetrics.memoryUsage.toFixed(0)} MB
                  </div>
                </div>
              </div>
            )}
            {customMetrics.wsLatency !== undefined && (
              <div className="flex items-center space-x-2">
                <Network className="h-4 w-4 text-cyan-500" />
                <div>
                  <div className="text-xs text-zinc-500">WS Latency</div>
                  <div className="text-sm text-white">
                    {formatDuration(customMetrics.wsLatency)}
                  </div>
                </div>
              </div>
            )}
            {customMetrics.dnsLookup !== undefined && (
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-pink-500" />
                <div>
                  <div className="text-xs text-zinc-500">DNS</div>
                  <div className="text-sm text-white">
                    {formatDuration(customMetrics.dnsLookup)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget Violations */}
      {showBudget && budgetReport && budgetReport.violations.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <h3 className="mb-3 text-sm font-semibold text-yellow-400">
            Performance Budget Violations
          </h3>
          <div className="space-y-2">
            {budgetReport.violations.map((violation, idx) => (
              <div key={idx} className="rounded-lg bg-zinc-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{violation.metric}</div>
                    <div className="text-xs text-zinc-500">{violation.impact}</div>
                  </div>
                  <div
                    className={`rounded px-2 py-1 text-xs ${
                      violation.severity === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : violation.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {violation.severity}
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {violation.currentValue.toFixed(2)} / {violation.threshold}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showBudget && budgetReport && budgetReport.recommendations.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <h3 className="mb-3 text-sm font-semibold text-blue-400">💡 Recommendations</h3>
          <div className="space-y-2">
            {budgetReport.recommendations.slice(0, 3).map((recommendation, idx) => (
              <div key={idx} className="text-sm text-zinc-300">
                • {recommendation}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center space-x-4">
          <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          <span>Web Vitals Score: {webVitalsScore.toFixed(0)}</span>
          {budgetReport && <span>Status: {budgetReport.status.toUpperCase()}</span>}
        </div>
        <span>Time window: 5 minutes</span>
      </div>
    </div>
  )
}
