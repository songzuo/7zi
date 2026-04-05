/**
 * Performance Dashboard Component
 * 性能仪表板组件 - 展示 Web Vitals、自定义指标和性能预算
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { webVitalsMonitor, calculateWebVitalsScore } from '@/lib/performance/web-vitals'
import { customMetricsTracker } from '@/lib/performance/custom-metrics'
import { budgetManager } from '@/lib/performance/budget-manager'
import type { WebVitalsMetrics, CustomMetrics, BudgetViolation, AlarmNotification } from '@/lib/performance'

/**
 * 性能指标卡片
 */
interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  status: 'good' | 'warning' | 'poor'
  trend?: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  description?: string
}

function MetricCard({
  title,
  value,
  unit,
  status,
  trend,
  icon,
  description,
}: MetricCardProps): JSX.Element {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    poor: 'text-red-600 dark:text-red-400',
  }

  const statusBgColors = {
    good: 'bg-green-100 dark:bg-green-900',
    warning: 'bg-yellow-100 dark:bg-yellow-900',
    poor: 'bg-red-100 dark:bg-red-900',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${statusBgColors[status]}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={`text-2xl font-bold ${statusColors[status]}`}>
            {typeof value === 'number' ? value.toFixed(2) : value}
          </div>
          {unit && <div className="text-sm text-gray-500 dark:text-gray-400">{unit}</div>}
        </div>
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-red-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-green-500" />
            ) : (
              <Activity className="h-3 w-3 text-gray-500" />
            )}
            <span className="text-gray-500 dark:text-gray-400">
              {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Improving' : 'Stable'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Web Vitals 仪表板
 */
function WebVitalsDashboard(): JSX.Element {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({})
  const [score, setScore] = useState(0)

  useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = webVitalsMonitor.getMetrics()
      setMetrics(currentMetrics)
      setScore(calculateWebVitalsScore(currentMetrics))
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [])

  const getMetricStatus = (name: keyof WebVitalsMetrics): 'good' | 'warning' | 'poor' => {
    if (webVitalsMonitor.isMetricGood(name)) return 'good'
    const value = metrics[name]
    if (!value) return 'warning'

    const thresholds: Record<string, { good: number; poor: number }> = {
      LCP: { good: 2500, poor: 4000 },
      CLS: { good: 0.1, poor: 0.25 },
      INP: { good: 200, poor: 500 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 },
    }

    const threshold = thresholds[name]
    if (!threshold) return 'warning'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'warning'
    return 'poor'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Core Web Vitals</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overall Score: <span className="font-bold">{score.toFixed(0)}/100</span>
          </p>
        </div>
        <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>
          {score >= 80 ? 'Good' : score >= 60 ? 'Needs Improvement' : 'Poor'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="LCP"
          value={metrics.LCP || 0}
          unit="ms"
          status={getMetricStatus('LCP')}
          icon={<Clock className="h-4 w-4" />}
          description="Largest Contentful Paint"
        />
        <MetricCard
          title="CLS"
          value={metrics.CLS || 0}
          status={getMetricStatus('CLS')}
          icon={<Activity className="h-4 w-4" />}
          description="Cumulative Layout Shift"
        />
        <MetricCard
          title="INP"
          value={metrics.INP || 0}
          unit="ms"
          status={getMetricStatus('INP')}
          icon={<Zap className="h-4 w-4" />}
          description="Interaction to Next Paint"
        />
        {metrics.FCP !== undefined && (
          <MetricCard
            title="FCP"
            value={metrics.FCP}
            unit="ms"
            status={getMetricStatus('FCP')}
            icon={<Globe className="h-4 w-4" />}
            description="First Contentful Paint"
          />
        )}
        {metrics.TTFB !== undefined && (
          <MetricCard
            title="TTFB"
            value={metrics.TTFB}
            unit="ms"
            status={getMetricStatus('TTFB')}
            icon={<Database className="h-4 w-4" />}
            description="Time to First Byte"
          />
        )}
      </div>
    </div>
  )
}

/**
 * 自定义指标仪表板
 */
function CustomMetricsDashboard(): JSX.Element {
  const [metrics, setMetrics] = useState<CustomMetrics>({})

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(customMetricsTracker.getMetrics())
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Custom Metrics</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Application-specific performance indicators
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.pageLoadTime !== undefined && (
          <MetricCard
            title="Page Load Time"
            value={metrics.pageLoadTime}
            unit="ms"
            status={metrics.pageLoadTime < 3000 ? 'good' : metrics.pageLoadTime < 5000 ? 'warning' : 'poor'}
            icon={<Clock className="h-4 w-4" />}
          />
        )}
        {metrics.domContentLoaded !== undefined && (
          <MetricCard
            title="DOM Content Loaded"
            value={metrics.domContentLoaded}
            unit="ms"
            status={metrics.domContentLoaded < 2000 ? 'good' : 'warning'}
            icon={<Activity className="h-4 w-4" />}
          />
        )}
        {metrics.apiAverageResponseTime !== undefined && (
          <MetricCard
            title="API Response Time"
            value={metrics.apiAverageResponseTime}
            unit="ms"
            status={
              metrics.apiAverageResponseTime < 500
                ? 'good'
                : metrics.apiAverageResponseTime < 1000
                  ? 'warning'
                  : 'poor'
            }
            icon={<Database className="h-4 w-4" />}
          />
        )}
        {metrics.apiSuccessRate !== undefined && (
          <MetricCard
            title="API Success Rate"
            value={metrics.apiSuccessRate * 100}
            unit="%"
            status={metrics.apiSuccessRate > 0.95 ? 'good' : metrics.apiSuccessRate > 0.9 ? 'warning' : 'poor'}
            icon={<CheckCircle className="h-4 w-4" />}
          />
        )}
        {metrics.memoryUsagePercent !== undefined && (
          <MetricCard
            title="Memory Usage"
            value={metrics.memoryUsagePercent}
            unit="%"
            status={
              metrics.memoryUsagePercent < 70
                ? 'good'
                : metrics.memoryUsagePercent < 85
                  ? 'warning'
                  : 'poor'
            }
            icon={<Cpu className="h-4 w-4" />}
          />
        )}
        {metrics.wsLatency !== undefined && (
          <MetricCard
            title="WebSocket Latency"
            value={metrics.wsLatency}
            unit="ms"
            status={metrics.wsLatency < 100 ? 'good' : metrics.wsLatency < 200 ? 'warning' : 'poor'}
            icon={<Zap className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  )
}

/**
 * 性能预算仪表板
 */
function PerformanceBudgetDashboard(): JSX.Element {
  const [report, setReport] = useState<PerformanceBudgetReport | null>(null)
  const [notifications, setNotifications] = useState<AlarmNotification[]>([])

  useEffect(() => {
    const updateReport = () => {
      const webVitals = webVitalsMonitor.getMetrics()
      const customMetrics = customMetricsTracker.getMetrics()

      const budgetReport = budgetManager.calculateBudgetReport(webVitals, customMetrics)
      setReport(budgetReport)

      const activeNotifications = budgetManager.getActiveNotifications()
      setNotifications(activeNotifications)
    }

    updateReport()
    const interval = setInterval(updateReport, 10000)

    return () => clearInterval(interval)
  }, [])

  if (!report) {
    return <div className="text-center text-gray-500">Loading performance budget...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance Budget</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Overall Score: <span className="font-bold">{report.overallScore.toFixed(0)}/100</span>
          </p>
        </div>
        <Badge
          variant={
            report.status === 'pass'
              ? 'default'
              : report.status === 'warning'
                ? 'secondary'
                : 'destructive'
          }
        >
          {report.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Web Vitals Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.webVitalsScore.toFixed(0)}</div>
            <Progress value={report.webVitalsScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custom Metrics Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.customMetricsScore.toFixed(0)}</div>
            <Progress value={report.customMetricsScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resource Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.resourceScore.toFixed(0)}</div>
            <Progress value={report.resourceScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {report.violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Budget Violations
            </CardTitle>
            <CardDescription>
              {report.violations.length} violation(s) detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.violations.map((violation: BudgetViolation, index: number) => (
                <div
                  key={index}
                  className="flex items-start justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          violation.severity === 'high'
                            ? 'destructive'
                            : violation.severity === 'medium'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {violation.severity}
                      </Badge>
                      <span className="font-medium">{violation.metric}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {violation.impact}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {typeof violation.currentValue === 'number'
                        ? violation.currentValue.toFixed(2)
                        : violation.currentValue}
                    </div>
                    <div className="text-xs text-gray-500">
                      Threshold: {violation.threshold}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Alarms
            </CardTitle>
            <CardDescription>{notifications.length} active alarm(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification: AlarmNotification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{notification.severity}</Badge>
                      <span className="font-medium">{notification.ruleName}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Optimization suggestions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * 性能仪表板主组件
 */
export function PerformanceDashboard(): JSX.Element {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Real-time performance monitoring and analysis
        </p>
      </div>

      <Tabs defaultValue="web-vitals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="custom-metrics">Custom Metrics</TabsTrigger>
          <TabsTrigger value="budget">Performance Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="web-vitals" className="mt-6">
          <WebVitalsDashboard />
        </TabsContent>

        <TabsContent value="custom-metrics" className="mt-6">
          <CustomMetricsDashboard />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <PerformanceBudgetDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}