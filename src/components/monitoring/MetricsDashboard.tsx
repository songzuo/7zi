/**
 * Monitoring Metrics Dashboard
 * 监控指标仪表板组件
 *
 * 功能：
 * - 实时显示系统指标
 * - API 性能监控
 * - 数据库健康状态
 * - 错误追踪
 * - 告警通知
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Server,
  TrendingUp,
  XCircle,
} from 'lucide-react'

// ============================================
// 类型定义
// ============================================

interface SystemMetrics {
  uptime: number
  memory: {
    used: string
    total: string
    percent: string
  }
  nodeVersion: string
}

interface ApiMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  slowRequests: number
  maxDuration: number
}

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  score: number
  timestamp: string
}

interface DashboardData {
  system: SystemMetrics
  api: ApiMetrics
  health: HealthStatus
  lastUpdated: string
}

// ============================================
// 主组件
// ============================================

export function MetricsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取指标数据
  useEffect(() => {
    fetchMetrics()

    // 每30秒刷新一次
    const interval = setInterval(fetchMetrics, 30000)

    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/metrics/performance?category=all')

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // 获取健康状态
        const healthResponse = await fetch('/api/health')
        const healthData = await healthResponse.json()

        setData({
          system: result.data.system || ({} as SystemMetrics),
          api: {
            totalRequests: result.data.apiPerformance?.summary?.totalRequests || 0,
            successfulRequests: result.data.apiPerformance?.summary?.successfulRequests || 0,
            failedRequests: result.data.apiPerformance?.summary?.failedRequests || 0,
            averageDuration: result.data.apiPerformance?.summary?.averageDuration || 0,
            slowRequests: result.data.apiPerformance?.summary?.slowRequests || 0,
            maxDuration: result.data.apiPerformance?.summary?.maxDuration || 0,
          },
          health: {
            status: healthData.status || 'ok',
            score: healthData.healthScore || 100,
            timestamp: healthData.timestamp || new Date().toISOString(),
          },
          lastUpdated: result.timestamp || new Date().toISOString(),
        })
        setError(null)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch metrics:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-destructive flex items-center space-x-2">
            <XCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        </div>
        <Badge variant={getHealthBadgeVariant(data.health.status)}>
          {getHealthStatusIcon(data.health.status)}
          {data.health.status.toUpperCase()} ({data.health.score.toFixed(0)}/100)
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Requests"
          value={data.api.totalRequests.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
          trend="up"
        />
        <MetricCard
          title="Success Rate"
          value={`${getSuccessRate(data.api).toFixed(1)}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          trend="stable"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${data.api.averageDuration.toFixed(0)}ms`}
          icon={<Clock className="h-4 w-4" />}
          trend={data.api.averageDuration > 500 ? 'up' : 'stable'}
        />
        <MetricCard
          title="Slow Requests"
          value={data.api.slowRequests.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={data.api.slowRequests > 0 ? 'up' : 'stable'}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* API Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>API Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow
              label="Successful Requests"
              value={data.api.successfulRequests.toLocaleString()}
              color="text-green-500"
            />
            <MetricRow
              label="Failed Requests"
              value={data.api.failedRequests.toLocaleString()}
              color="text-red-500"
            />
            <MetricRow
              label="Max Response Time"
              value={`${data.api.maxDuration.toFixed(0)}ms`}
              color="text-yellow-500"
            />
            <MetricRow label="Average Latency" value={`${data.api.averageDuration.toFixed(2)}ms`} />
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricRow
              label="Uptime"
              value={formatUptime(data.system.uptime)}
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricRow
              label="Memory Usage"
              value={`${data.system.memory.percent}%`}
              detail={`${data.system.memory.used} / ${data.system.memory.total}`}
              icon={<Server className="h-4 w-4" />}
              color={getMemoryColor(parseFloat(data.system.memory.percent))}
            />
            <MetricRow label="Node Version" value={data.system.nodeVersion} />
            <MetricRow
              label="Health Score"
              value={`${data.health.score.toFixed(0)}/100`}
              color={getHealthColor(data.health.score)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {data.api.failedRequests > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-warning flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Active Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AlertItem
                title="High Error Rate"
                message={`${data.api.failedRequests} failed requests detected`}
                severity="warning"
              />
              {data.api.slowRequests > 0 && (
                <AlertItem
                  title="Slow Requests Detected"
                  message={`${data.api.slowRequests} requests exceeded 500ms threshold`}
                  severity="info"
                />
              )}
              {parseFloat(data.system.memory.percent) > 80 && (
                <AlertItem
                  title="High Memory Usage"
                  message={`Memory usage at ${data.system.memory.percent}%`}
                  severity="critical"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <p>Monitoring powered by 7zi Monitoring System</p>
        <button onClick={fetchMetrics} className="text-primary hover:underline">
          Refresh
        </button>
      </div>
    </div>
  )
}

// ============================================
// 子组件
// ============================================

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
}

function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="flex items-center space-x-2">
            {icon}
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricRowProps {
  label: string
  value: string
  detail?: string
  icon?: React.ReactNode
  color?: string
}

function MetricRow({ label, value, detail, icon, color }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <div className="text-right">
        <p className={`font-medium ${color}`}>{value}</p>
        {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
      </div>
    </div>
  )
}

interface AlertItemProps {
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}

function AlertItem({ title, message, severity }: AlertItemProps) {
  const severityStyles = {
    info: 'border-blue-500 bg-blue-50',
    warning: 'border-yellow-500 bg-yellow-50',
    critical: 'border-red-500 bg-red-50',
  }

  return (
    <div className={`rounded-lg border p-3 ${severityStyles[severity]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{message}</p>
    </div>
  )
}

// ============================================
// 工具函数
// ============================================

function getSuccessRate(api: ApiMetrics): number {
  if (api.totalRequests === 0) return 100
  return (api.successfulRequests / api.totalRequests) * 100
}

function getHealthBadgeVariant(status: string): 'default' | 'destructive' | 'outline' {
  switch (status) {
    case 'ok':
      return 'default'
    case 'degraded':
      return 'outline'
    case 'error':
      return 'destructive'
    default:
      return 'default'
  }
}

function getHealthStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'ok':
      return <CheckCircle className="mr-1 h-4 w-4" />
    case 'degraded':
      return <AlertTriangle className="mr-1 h-4 w-4" />
    case 'error':
      return <XCircle className="mr-1 h-4 w-4" />
    default:
      return null
  }
}

function getMemoryColor(percent: number): string {
  if (percent > 80) return 'text-red-500'
  if (percent > 60) return 'text-yellow-500'
  return 'text-green-500'
}

function getHealthColor(score: number): string {
  if (score < 60) return 'text-red-500'
  if (score < 80) return 'text-yellow-500'
  return 'text-green-500'
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.length > 0 ? parts.join(' ') : '< 1m'
}
