/**
 * Enhanced Monitoring Dashboard v1.12.2
 * 增强版性能监控仪表板 - 集成实时图表、告警配置、历史数据查询
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
  RefreshCw,
  Settings,
  History,
  BarChart3,
} from 'lucide-react'
import { monitor } from '@/lib/monitoring'
import type { AggregatedMetrics, AlarmEvent } from '@/lib/monitoring/types'
import { PerformanceChart } from './PerformanceChart'
import { AlarmConfigPanel } from './AlarmConfigPanel'
import { HistoryDataPanel } from './HistoryDataPanel'

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
 * 实时监控仪表板
 */
function RealtimeDashboard(): JSX.Element {
  const [aggregatedData, setAggregatedData] = useState<AggregatedMetrics | null>(null)
  const [recentAlarms, setRecentAlarms] = useState<AlarmEvent[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5000)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadData = async () => {
    setIsRefreshing(true)
    try {
      const aggregated = await monitor.getAggregatedMetrics(5 * 60 * 1000)
      setAggregatedData(aggregated)

      const alarms = await monitor.getAlarms(Date.now() - 60 * 60 * 1000)
      setRecentAlarms(alarms.slice(-10).reverse())
    } catch (error) {
      console.error('Failed to load monitoring data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'poor' => {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.warning) return 'warning'
    return 'poor'
  }

  if (!aggregatedData) {
    return <div className="text-center text-gray-500">Loading monitoring data...</div>
  }

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Monitoring</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="API Requests"
          value={aggregatedData.apiMetrics.totalRequests}
          status="good"
          icon={<Database className="h-4 w-4" />}
          description="Total requests in 5min"
        />
        <MetricCard
          title="Avg Response Time"
          value={aggregatedData.apiMetrics.averageResponseTime}
          unit="ms"
          status={getStatus(
            aggregatedData.apiMetrics.averageResponseTime,
            { good: 500, warning: 2000 }
          )}
          icon={<Clock className="h-4 w-4" />}
          description="Average API response time"
        />
        <MetricCard
          title="Success Rate"
          value={aggregatedData.apiMetrics.successRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.apiMetrics.successRate * 100,
            { good: 95, warning: 90 }
          )}
          icon={<CheckCircle className="h-4 w-4" />}
          description="API success rate"
        />
        <MetricCard
          title="Error Rate"
          value={aggregatedData.apiMetrics.errorRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.apiMetrics.errorRate * 100,
            { good: 2, warning: 5 }
          )}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="API error rate"
        />
      </div>

      {/* 操作指标 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Operations"
          value={aggregatedData.operationMetrics.totalOperations}
          status="good"
          icon={<Activity className="h-4 w-4" />}
          description="Total operations in 5min"
        />
        <MetricCard
          title="Avg Duration"
          value={aggregatedData.operationMetrics.averageDuration}
          unit="ms"
          status={getStatus(
            aggregatedData.operationMetrics.averageDuration,
            { good: 1000, warning: 5000 }
          )}
          icon={<Zap className="h-4 w-4" />}
          description="Average operation duration"
        />
        <MetricCard
          title="Operation Success"
          value={aggregatedData.operationMetrics.successRate * 100}
          unit="%"
          status={getStatus(
            aggregatedData.operationMetrics.successRate * 100,
            { good: 95, warning: 90 }
          )}
          icon={<CheckCircle className="h-4 w-4" />}
          description="Operation success rate"
        />
      </div>

      {/* 实时图表 */}
      <div className="grid gap-4 md:grid-cols-2">
        <PerformanceChart
          data={[]}
          title="API Response Time (Real-time)"
          unit="ms"
          color="#3b82f6"
          threshold={5000}
          thresholdColor="#ef4444"
          thresholdLabel="5s Threshold"
        />
        <PerformanceChart
          data={[]}
          title="Operation Duration (Real-time)"
          unit="ms"
          color="#10b981"
          threshold={10000}
          thresholdColor="#ef4444"
          thresholdLabel="10s Threshold"
        />
      </div>

      {/* 最近告警 */}
      {recentAlarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Recent Alarms
            </CardTitle>
            <CardDescription>
              {recentAlarms.length} alarm(s) in the last hour
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
                    <p className="mt-1 text-sm text-gray-500">{alarm.message}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {alarm.currentValue.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Threshold: {alarm.threshold}
                    </div>
                    <div className="text-xs text-gray-400">
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
 * 增强版监控仪表板主组件
 */
export function EnhancedMonitoringDashboard(): JSX.Element {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Enhanced Monitoring Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          v1.12.2 - Real-time performance monitoring with advanced analytics
        </p>
      </div>

      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="alarms" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Alarm Config
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="mt-6">
          <RealtimeDashboard />
        </TabsContent>

        <TabsContent value="alarms" className="mt-6">
          <AlarmConfigPanel />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryDataPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}