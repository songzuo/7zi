'use client'

/**
 * Performance Dashboard Page
 * Displays comprehensive performance metrics, charts, and alerts
 */

import { useState, useEffect, Suspense, useCallback } from 'react'
import dynamic from 'next/dynamic'

// 🚀 优化：将图表组件动态导入，减少初始 bundle 大小
const PerformanceCharts = dynamic(() => import('./PerformanceCharts'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-gray-500">Loading charts...</div>
  ),
})

import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  Bell,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// ========================================
// Types
// ========================================

interface MetricStats {
  count: number
  avg: number
  min: number
  max: number
  p50: number
  p90: number
  p95: number
  good: number
  needsImprovement: number
  poor: number
}

interface PerformanceAlert {
  id: string
  ruleId: string
  metric: string
  value: number
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  route: string
  message: string
  acknowledged: boolean
}

interface TimeSeriesData {
  timestamp: number
  value: number
}

interface MetricReport {
  name: string
  stats: MetricStats
  trend: 'improving' | 'stable' | 'degrading'
  trendPercentage: number
  timeSeries: TimeSeriesData[]
  recentAlerts: number
}

// ========================================
// Constants
// ========================================

const METRIC_CONFIGS = {
  LCP: {
    label: 'Largest Contentful Paint',
    unit: 'ms',
    thresholds: { good: 2500, needsImprovement: 4000 },
    color: '#3b82f6',
  },
  FID: {
    label: 'First Input Delay',
    unit: 'ms',
    thresholds: { good: 100, needsImprovement: 300 },
    color: '#10b981',
  },
  CLS: {
    label: 'Cumulative Layout Shift',
    unit: '',
    thresholds: { good: 0.1, needsImprovement: 0.25 },
    color: '#f59e0b',
  },
  INP: {
    label: 'Interaction to Next Paint',
    unit: 'ms',
    thresholds: { good: 200, needsImprovement: 500 },
    color: '#8b5cf6',
  },
  TTFB: {
    label: 'Time to First Byte',
    unit: 'ms',
    thresholds: { good: 800, needsImprovement: 1800 },
    color: '#ef4444',
  },
  FCP: {
    label: 'First Contentful Paint',
    unit: 'ms',
    thresholds: { good: 1800, needsImprovement: 3000 },
    color: '#06b6d4',
  },
}

// ========================================
// Components
// ========================================

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' | 'critical' }) {
  const config = {
    low: { color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200' },
    medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    high: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    critical: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${config[severity].color}`}>
      {severity.toUpperCase()}
    </span>
  )
}

function TrendIndicator({
  trend,
  percentage,
}: {
  trend: 'improving' | 'stable' | 'degrading'
  percentage: number
}) {
  const config = {
    improving: { color: 'text-green-600', icon: TrendingDown },
    stable: { color: 'text-zinc-600', icon: Minus },
    degrading: { color: 'text-red-600', icon: TrendingUp },
  }

  const { color, icon: Icon } = config[trend]

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${color}`}>
      <Icon className="h-4 w-4" />
      {trend === 'stable' ? 'Stable' : `${percentage.toFixed(1)}%`}
    </span>
  )
}

function MetricCard({
  name,
  stats,
  trend,
  trendPercentage,
}: {
  name: string
  stats: MetricStats
  trend: 'improving' | 'stable' | 'degrading'
  trendPercentage: number
}) {
  const config = METRIC_CONFIGS[name as keyof typeof METRIC_CONFIGS]
  const unit = config?.unit || ''
  const goodPercentage = stats.count > 0 ? ((stats.good / stats.count) * 100).toFixed(0) : '0'
  const poorPercentage = stats.count > 0 ? ((stats.poor / stats.count) * 100).toFixed(0) : '0'

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {config?.label || name}
          </h3>
          <p className="mt-2 text-3xl font-bold">
            {stats.avg.toFixed(0)}
            {unit}
          </p>
        </div>
        <TrendIndicator trend={trend} percentage={trendPercentage} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Good</p>
          <p className="text-lg font-semibold text-green-600">{goodPercentage}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Needs Improvement</p>
          <p className="text-lg font-semibold text-yellow-600">
            {((stats.needsImprovement / stats.count) * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Poor</p>
          <p className="text-lg font-semibold text-red-600">{poorPercentage}%</p>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <div>
            P50: {stats.p50.toFixed(0)}
            {unit}
          </div>
          <div>
            P90: {stats.p90.toFixed(0)}
            {unit}
          </div>
          <div>
            P95: {stats.p95.toFixed(0)}
            {unit}
          </div>
          <div>Count: {stats.count}</div>
        </div>
      </div>
    </Card>
  )
}

function MetricChart({
  name: _name,
  data,
  color,
}: {
  name: string
  data: TimeSeriesData[]
  color: string
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-gray-500">Loading chart...</div>
      }
    >
      <PerformanceCharts data={data} chartType="area" xKey="timestamp" yKey="value" color={color} />
    </Suspense>
  )
}

// ========================================
// Main Component
// ========================================

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<Record<string, MetricReport> | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h')
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true)

      const [reportRes, alertsRes] = await Promise.all([
        fetch(`/api/performance/report?period=${selectedPeriod}`),
        fetch('/api/performance/alerts'),
      ])

      const reportData = await reportRes.json()
      const alertsData = await alertsRes.json()

      if (reportData.success && reportData.report) {
        setReport(reportData.report.metrics)
      }

      if (alertsData.success) {
        setAlerts(alertsData.alerts.filter((a: PerformanceAlert) => !a.acknowledged))
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchPerformanceData()
    const interval = setInterval(fetchPerformanceData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [fetchPerformanceData])

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId }),
      })

      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const severityOrder = ['critical', 'high', 'medium', 'low']
  const sortedAlerts = [...alerts].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  )

  const overallRating = report
    ? (() => {
        const values = Object.values(report)
        const poorCount = values.filter(m => m.stats.poor / m.stats.count > 0.2).length
        if (poorCount > values.length / 2) return 'poor'
        if (poorCount > 0) return 'needs-improvement'
        return 'good'
      })()
    : 'good'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Monitor your application&apos;s performance in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={e =>
                setSelectedPeriod(e.target.value as '1h' | '6h' | '24h' | '7d' | '30d')
              }
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <Button onClick={fetchPerformanceData} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-full p-3 ${overallRating === 'good' ? 'bg-green-100 dark:bg-green-900' : overallRating === 'needs-improvement' ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-red-100 dark:bg-red-900'}`}
            >
              <Shield
                className={`h-8 w-8 ${overallRating === 'good' ? 'text-green-600 dark:text-green-400' : overallRating === 'needs-improvement' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold capitalize">{overallRating} Performance</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {overallRating === 'good'
                  ? 'All metrics are within healthy ranges'
                  : overallRating === 'needs-improvement'
                    ? 'Some metrics need attention'
                    : 'Critical performance issues detected'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Alerts</p>
            <p
              className={`text-3xl font-bold ${sortedAlerts.length > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {sortedAlerts.length}
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts Section */}
      {sortedAlerts.length > 0 && (
        <Card className="border-red-200 p-6 dark:border-red-800">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold">Active Alerts</h3>
          </div>
          <div className="space-y-3">
            {sortedAlerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm font-medium">{alert.metric}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                  className="text-xs"
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metrics Grid */}
      {report && Object.keys(report).length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(report).map(([name, data]) => (
            <MetricCard
              key={name}
              name={name}
              stats={data.stats}
              trend={data.trend}
              trendPercentage={data.trendPercentage}
            />
          ))}
        </div>
      )}

      {/* Charts Section */}
      {report && selectedMetric && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {METRIC_CONFIGS[selectedMetric as keyof typeof METRIC_CONFIGS]?.label ||
                selectedMetric}{' '}
              Trend
            </h3>
            <select
              value={selectedMetric || ''}
              onChange={e => setSelectedMetric(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {Object.keys(report).map(name => (
                <option key={name} value={name}>
                  {METRIC_CONFIGS[name as keyof typeof METRIC_CONFIGS]?.label || name}
                </option>
              ))}
            </select>
          </div>
          <MetricChart
            name={selectedMetric}
            data={report[selectedMetric]?.timeSeries || []}
            color={
              METRIC_CONFIGS[selectedMetric as keyof typeof METRIC_CONFIGS]?.color || '#3b82f6'
            }
          />
        </Card>
      )}

      {loading && (
        <div className="py-12 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-4 text-zinc-500">Loading performance data...</p>
        </div>
      )}
    </div>
  )
}
