/**
 * PerformanceMonitorDashboard - 性能监控仪表板增强版
 *
 * 集成实时性能指标卡片、数据可视化图表、时间范围选择器、
 * 自动刷新和性能告警阈值配置的完整仪表板。
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
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
  RefreshCw,
  Settings,
  History,
  BarChart3,
  HardDrive,
  Network,
  Monitor,
  Bell,
} from 'lucide-react'
import { ResourceUsageChart } from '@/components/analytics/charts/ResourceUsageChart'
import { PerformanceChart } from './PerformanceChart'
import { AlarmConfigPanel, AlarmRule } from './AlarmConfigPanel'
import { monitor } from '@/lib/monitoring'
import type { AggregatedMetrics, AlarmEvent } from '@/lib/monitoring/types'
import type { ResourceUsageData } from '@/lib/analytics/types'

export interface PerformanceMetricCardData {
  title: string
  value: number
  unit?: string
  status: 'good' | 'warning' | 'poor'
  trend?: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  description?: string
  thresholds?: { good: number; warning: number }
}

export interface TimeRangeOption {
  label: string
  value: string
  milliseconds: number
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: '5 分钟', value: '5m', milliseconds: 5 * 60 * 1000 },
  { label: '15 分钟', value: '15m', milliseconds: 15 * 60 * 1000 },
  { label: '30 分钟', value: '30m', milliseconds: 30 * 60 * 1000 },
  { label: '1 小时', value: '1h', milliseconds: 60 * 60 * 1000 },
  { label: '6 小时', value: '6h', milliseconds: 6 * 60 * 60 * 1000 },
  { label: '24 小时', value: '24h', milliseconds: 24 * 60 * 60 * 1000 },
]

export interface PerformanceMonitorDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  className?: string
}

/**
 * Performance Metric Card Component
 */
function PerformanceMetricCard({
  title,
  value,
  unit,
  status,
  trend,
  icon,
  description,
  thresholds,
}: PerformanceMetricCardData): JSX.Element {
  const statusColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    poor: 'text-red-600 dark:text-red-400',
  }

  const statusBgColors = {
    good: 'bg-green-100 dark:bg-green-900/20',
    warning: 'bg-yellow-100 dark:bg-yellow-900/20',
    poor: 'bg-red-100 dark:bg-red-900/20',
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
            {typeof value === 'number' ? value.toFixed(1) : value}
          </div>
          {unit && <div className="text-sm text-muted-foreground">{unit}</div>}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-red-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-green-500" />
            ) : (
              <Activity className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">
              {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Improving' : 'Stable'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Loading Skeleton
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>

      <Skeleton className="h-80" />
    </div>
  )
}

/**
 * Real-time Metrics Section
 */
function RealtimeMetricsSection({
  aggregatedData,
  recentAlarms,
}: {
  aggregatedData: AggregatedMetrics | null
  recentAlarms: AlarmEvent[]
}): JSX.Element {
  if (!aggregatedData) {
    return <DashboardSkeleton />
  }

  const getStatus = (value: number, thresholds?: { good: number; warning: number }): 'good' | 'warning' | 'poor' => {
    if (!thresholds) return 'good'
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.warning) return 'warning'
    return 'poor'
  }

  // Calculate system metrics (simulated - would come from real monitoring data)
  const cpuUsage = 45 + Math.random() * 20
  const memoryUsage = 60 + Math.random() * 15
  const networkUsage = 30 + Math.random() * 25
  const diskUsage = 55 + Math.random() * 10

  const metricCards: PerformanceMetricCardData[] = [
    {
      title: 'CPU 使用率',
      value: cpuUsage,
      unit: '%',
      status: getStatus(cpuUsage, { good: 60, warning: 80 }),
      icon: <Cpu className="h-4 w-4" />,
      description: '系统 CPU 使用情况',
      thresholds: { good: 60, warning: 80 },
    },
    {
      title: '内存使用率',
      value: memoryUsage,
      unit: '%',
      status: getStatus(memoryUsage, { good: 70, warning: 85 }),
      icon: <Database className="h-4 w-4" />,
      description: '系统内存使用情况',
      thresholds: { good: 70, warning: 85 },
    },
    {
      title: '网络使用率',
      value: networkUsage,
      unit: '%',
      status: getStatus(networkUsage, { good: 70, warning: 85 }),
      icon: <Network className="h-4 w-4" />,
      description: '网络带宽使用情况',
      thresholds: { good: 70, warning: 85 },
    },
    {
      title: '磁盘使用率',
      value: diskUsage,
      unit: '%',
      status: getStatus(diskUsage, { good: 70, warning: 85 }),
      icon: <HardDrive className="h-4 w-4" />,
      description: '磁盘空间使用情况',
      thresholds: { good: 70, warning: 85 },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Performance Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, index) => (
          <PerformanceMetricCard key={index} {...card} />
        ))}
      </div>

      {/* API Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PerformanceMetricCard
          title="API 请求总数"
          value={aggregatedData.apiMetrics.totalRequests}
          status="good"
          icon={<Database className="h-4 w-4" />}
          description="过去 5 分钟"
        />
        <PerformanceMetricCard
          title="平均响应时间"
          value={aggregatedData.apiMetrics.averageResponseTime}
          unit="ms"
          status={getStatus(
            aggregatedData.apiMetrics.averageResponseTime,
            { good: 500, warning: 2000 }
          )}
          icon={<Clock className="h-4 w-4" />}
          description="API 响应时间"
        />
        <PerformanceMetricCard
          title="成功率"
          value={aggregatedData.apiMetrics.successRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.apiMetrics.successRate * 100,
            { good: 95, warning: 90 }
          )}
          icon={<CheckCircle className="h-4 w-4" />}
          description="API 成功响应率"
        />
        <PerformanceMetricCard
          title="错误率"
          value={aggregatedData.apiMetrics.errorRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.apiMetrics.errorRate * 100,
            { good: 2, warning: 5 }
          )}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="API 错误率"
        />
      </div>

      {/* Operation Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <PerformanceMetricCard
          title="操作总数"
          value={aggregatedData.operationMetrics.totalOperations}
          status="good"
          icon={<Activity className="h-4 w-4" />}
          description="过去 5 分钟"
        />
        <PerformanceMetricCard
          title="平均持续时间"
          value={aggregatedData.operationMetrics.averageDuration}
          unit="ms"
          status={getStatus(
            aggregatedData.operationMetrics.averageDuration,
            { good: 1000, warning: 5000 }
          )}
          icon={<Zap className="h-4 w-4" />}
          description="操作平均耗时"
        />
        <PerformanceMetricCard
          title="操作成功率"
          value={aggregatedData.operationMetrics.successRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.operationMetrics.successRate * 100,
            { good: 95, warning: 90 }
          )}
          icon={<CheckCircle className="h-4 w-4" />}
          description="操作成功比例"
        />
      </div>

      {/* Recent Alarms */}
      {recentAlarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-500" />
              最近告警
            </CardTitle>
            <CardDescription>
              过去 {recentAlarms.length} 条告警事件
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-start justify-between rounded-lg border p-3 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alarm.severity === 'critical'
                            ? 'destructive'
                            : alarm.severity === 'high'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {alarm.severity}
                      </Badge>
                      <span className="font-medium">{alarm.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{alarm.message}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {alarm.currentValue.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      阈值: {alarm.threshold}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alarm.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * PerformanceMonitorDashboard Main Component
 */
export function PerformanceMonitorDashboard({
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className,
}: PerformanceMonitorDashboardProps): JSX.Element {
  const [activeTab, setActiveTab] = useState('realtime')
  const [selectedTimeRange, setSelectedTimeRange] = useState('30m')
  const [aggregatedData, setAggregatedData] = useState<AggregatedMetrics | null>(null)
  const [recentAlarms, setRecentAlarms] = useState<AlarmEvent[]>([])
  const [resourceData, setResourceData] = useState<ResourceUsageData[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const timeRangeMs = TIME_RANGE_OPTIONS.find((opt) => opt.value === selectedTimeRange)?.milliseconds || 30 * 60 * 1000

      // Fetch aggregated metrics
      const aggregated = await monitor.getAggregatedMetrics(timeRangeMs)
      setAggregatedData(aggregated)

      // Fetch alarms
      const alarms = await monitor.getAlarms(Date.now() - timeRangeMs)
      setRecentAlarms(alarms.slice(-20).reverse())

      // Generate resource usage data (simulated - would come from real API)
      const now = Date.now()
      const newResourceData: ResourceUsageData[] = []
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now - (23 - i) * timeRangeMs / 24).toISOString()
        newResourceData.push({
          timestamp,
          cpuUsage: 40 + Math.random() * 30,
          memoryUsage: 50 + Math.random() * 25,
          diskUsage: 55 + Math.random() * 15,
          networkUsage: 25 + Math.random() * 35,
        })
      }
      setResourceData(newResourceData)

      setLastUpdate(new Date())
    } catch (error) {
      console.error('[PerformanceMonitorDashboard] Failed to fetch data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedTimeRange])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  // Time range change handler
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value)
  }

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchData()
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">性能监控仪表板</h1>
          <p className="text-muted-foreground mt-1">
            实时监控系统性能指标和资源使用情况
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <div className="text-sm text-muted-foreground">
              最后更新: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              实时监控
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              图表分析
            </TabsTrigger>
            <TabsTrigger value="alarms" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              告警配置
            </TabsTrigger>
          </TabsList>

          {activeTab === 'realtime' || activeTab === 'charts' ? (
            <Select value={selectedTimeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择时间范围" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        {/* Realtime Tab */}
        <TabsContent value="realtime" className="mt-0">
          <RealtimeMetricsSection
            aggregatedData={aggregatedData}
            recentAlarms={recentAlarms}
          />
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="mt-0">
          <div className="space-y-6">
            {/* Resource Usage Chart */}
            <ResourceUsageChart
              data={resourceData}
              title="资源使用趋势"
              height={350}
            />

            {/* Performance Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <PerformanceChart
                data={[
                  { timestamp: Date.now() - 5000, value: 450 + Math.random() * 100 },
                  { timestamp: Date.now() - 4000, value: 420 + Math.random() * 120 },
                  { timestamp: Date.now() - 3000, value: 480 + Math.random() * 90 },
                  { timestamp: Date.now() - 2000, value: 390 + Math.random() * 150 },
                  { timestamp: Date.now() - 1000, value: 460 + Math.random() * 80 },
                  { timestamp: Date.now(), value: 440 + Math.random() * 100 },
                ]}
                title="API 响应时间"
                unit="ms"
                color="#3b82f6"
                threshold={5000}
                thresholdColor="#ef4444"
                thresholdLabel="5s 阈值"
                height={300}
              />
              <PerformanceChart
                data={[
                  { timestamp: Date.now() - 5000, value: 1200 + Math.random() * 500 },
                  { timestamp: Date.now() - 4000, value: 1500 + Math.random() * 600 },
                  { timestamp: Date.now() - 3000, value: 980 + Math.random() * 400 },
                  { timestamp: Date.now() - 2000, value: 1650 + Math.random() * 700 },
                  { timestamp: Date.now() - 1000, value: 1100 + Math.random() * 450 },
                  { timestamp: Date.now(), value: 1400 + Math.random() * 550 },
                ]}
                title="操作持续时间"
                unit="ms"
                color="#10b981"
                threshold={10000}
                thresholdColor="#ef4444"
                thresholdLabel="10s 阈值"
                height={300}
              />
            </div>
          </div>
        </TabsContent>

        {/* Alarms Tab */}
        <TabsContent value="alarms" className="mt-0">
          <AlarmConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PerformanceMonitorDashboard
