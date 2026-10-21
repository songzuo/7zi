/**
 * History Data Panel
 * 历史数据查询与聚合展示
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Database,
} from 'lucide-react'
import { monitor } from '@/lib/monitoring'
import type { PerformanceMetric, AggregatedMetrics } from '@/lib/monitoring/types'
import { PerformanceChart } from './PerformanceChart'

interface TimeRange {
  label: string
  value: number
}

interface MetricFilter {
  type?: string
  startTime?: number
  endTime?: number
}

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 15 minutes', value: 15 * 60 * 1000 },
  { label: 'Last 1 hour', value: 60 * 60 * 1000 },
  { label: 'Last 6 hours', value: 6 * 60 * 60 * 1000 },
  { label: 'Last 24 hours', value: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: 7 * 24 * 60 * 60 * 1000 },
]

export function HistoryDataPanel(): React.ReactElement {
  const [timeRange, setTimeRange] = useState<number>(TIME_RANGES[2].value)
  const [metricType, setMetricType] = useState<string>('all')
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [aggregatedData, setAggregatedData] = useState<AggregatedMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [exportData, setExportData] = useState<string>('')
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    loadData()
  }, [timeRange, metricType])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const filter: MetricFilter = {
        startTime: Date.now() - timeRange,
        endTime: Date.now(),
      }
      if (metricType !== 'all') {
        filter.type = metricType
      }

      const allMetrics = await monitor.getMetrics(filter)
      setMetrics(allMetrics)

      const aggregated = await monitor.getAggregatedMetrics(timeRange)
      setAggregatedData(aggregated)

      // 准备导出数据
      prepareExportData(allMetrics)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const prepareExportData = (data: PerformanceMetric[]) => {
    const headers = ['Timestamp', 'Type', 'Name', 'Value', 'Unit']
    const rows = data.map(m => [
      new Date(m.timestamp).toISOString(),
      m.type,
      m.name,
      m.value.toString(),
      m.unit,
    ])
    setExportData([headers.join(','), ...rows.map(r => r.join(','))].join('\n'))
  }

  const handleExport = () => {
    const blob = new Blob([exportData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metrics-export-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleString()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // 准备图表数据
  const prepareChartData = (type: string) => {
    const filtered = metrics.filter(m => m.type === type)
    return filtered.map(m => ({
      timestamp: m.timestamp,
      value: m.value,
    }))
  }

  // 计算趋势
  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const change = ((current - previous) / previous) * 100
    if (Math.abs(change) < 5) return 'stable'
    return change > 0 ? 'up' : 'down'
  }

  return (
    <div className="space-y-6">
      {/* 筛选和控制栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                History Data
              </CardTitle>
              <CardDescription>
                Query and analyze historical performance metrics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExport(!showExport)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Time Range</Label>
              <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value.toString()}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label>Metric Type</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="api">API Requests</SelectItem>
                  <SelectItem value="operation">Operations</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 聚合统计 */}
      {aggregatedData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                API Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold">
                    {aggregatedData.apiMetrics.totalRequests}
                  </div>
                  <div className="text-xs text-gray-500">Total Requests</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {aggregatedData.apiMetrics.averageResponseTime.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">Avg Response (ms)</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {(aggregatedData.apiMetrics.successRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      aggregatedData.apiMetrics.errorRate < 0.05
                        ? 'default'
                        : aggregatedData.apiMetrics.errorRate < 0.1
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {(aggregatedData.apiMetrics.errorRate * 100).toFixed(2)}% Error Rate
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold">
                    {aggregatedData.operationMetrics.totalOperations}
                  </div>
                  <div className="text-xs text-gray-500">Total Operations</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {aggregatedData.operationMetrics.averageDuration.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">Avg Duration (ms)</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {(aggregatedData.operationMetrics.successRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Time window: {formatDuration(timeRange)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-500" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {aggregatedData.errorMetrics.totalErrors}
                  </div>
                  <div className="text-xs text-gray-500">Total Errors</div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {Object.entries(aggregatedData.errorMetrics.errorsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="truncate">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表展示 */}
      <Tabs defaultValue="response-time" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="response-time">Response Time</TabsTrigger>
          <TabsTrigger value="operation-duration">Operation Duration</TabsTrigger>
          <TabsTrigger value="error-rate">Error Rate</TabsTrigger>
        </TabsList>

        <TabsContent value="response-time" className="mt-4">
          <PerformanceChart
            data={prepareChartData('api')}
            title="API Response Time Over Time"
            unit="ms"
            color="#3b82f6"
            threshold={5000}
            thresholdColor="#ef4444"
            thresholdLabel="5s Threshold"
          />
        </TabsContent>

        <TabsContent value="operation-duration" className="mt-4">
          <PerformanceChart
            data={prepareChartData('operation')}
            title="Operation Duration Over Time"
            unit="ms"
            color="#10b981"
            threshold={10000}
            thresholdColor="#ef4444"
            thresholdLabel="10s Threshold"
          />
        </TabsContent>

        <TabsContent value="error-rate" className="mt-4">
          <PerformanceChart
            data={prepareChartData('error')}
            title="Error Count Over Time"
            unit="count"
            color="#ef4444"
            maxY={10}
          />
        </TabsContent>
      </Tabs>

      {/* 原始数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Metrics</CardTitle>
          <CardDescription>
            {metrics.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Value</th>
                  <th className="text-left p-2">Unit</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(-100).map((metric) => (
                  <tr key={metric.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{formatTimestamp(metric.timestamp)}</td>
                    <td className="p-2">
                      <Badge
                        variant={
                          metric.type === 'error'
                            ? 'destructive'
                            : metric.type === 'api'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {metric.type}
                      </Badge>
                    </td>
                    <td className="p-2 max-w-xs truncate">{metric.name}</td>
                    <td className="p-2 text-right font-medium">{metric.value.toFixed(2)}</td>
                    <td className="p-2 text-gray-500">{metric.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 导出数据 */}
      {showExport && (
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>
              Download metrics as CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={handleExport} disabled={!exportData}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <div className="flex-1">
                <Label>Preview</Label>
                <textarea
                  value={exportData}
                  readOnly
                  className="w-full h-32 mt-1 p-2 text-xs font-mono border rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}