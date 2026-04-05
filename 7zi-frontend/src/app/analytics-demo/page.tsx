/**
 * Analytics Dashboard Demo Page
 * 演示 Analytics Dashboard 数据可视化功能
 */

'use client'

import { useState } from 'react'
import { useAnalytics } from '@/hooks/useAnalytics'
import { WorkflowStatsCard, ExecutionTrendChart } from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, SelectItem } from '@/components/ui/Select'
import type { TimeRange } from '@/lib/analytics/service'

export default function AnalyticsDashboardDemo() {
  const [workflowId, setWorkflowId] = useState('demo-workflow-1')
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [trendDays, setTrendDays] = useState(7)

  const { stats, trend, loading, error, refetch } = useAnalytics(
    workflowId,
    timeRange,
    trendDays,
    { refetchInterval: 30000 } // 每30秒自动刷新
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            工作流执行数据可视化 - v1.12.3
          </p>
        </div>
        <Button onClick={refetch} disabled={loading}>
          {loading ? '加载中...' : '刷新数据'}
        </Button>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">工作流 ID</label>
              <Select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}>
                <option value="demo-workflow-1">Demo Workflow 1</option>
                <option value="demo-workflow-2">Demo Workflow 2</option>
                <option value="demo-workflow-3">Demo Workflow 3</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">时间范围</label>
              <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)}>
                <option value="1h">最近 1 小时</option>
                <option value="24h">最近 24 小时</option>
                <option value="7d">最近 7 天</option>
                <option value="30d">最近 30 天</option>
                <option value="90d">最近 90 天</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">趋势天数</label>
              <Select value={trendDays.toString()} onChange={(e) => setTrendDays(Number(e.target.value))}>
                <option value="7">7 天</option>
                <option value="14">14 天</option>
                <option value="30">30 天</option>
                <option value="90">90 天</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">加载失败: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WorkflowStatsCard
          totalExecutions={stats?.totalExecutions ?? 0}
          successRate={stats?.successRate ?? 0}
          avgDuration={stats?.avgExecutionTime ?? 0}
          timeRange={timeRange}
          loading={loading}
        />
      </div>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExecutionTrendChart
          data={trend}
          title="执行趋势（折线图）"
          chartType="line"
          loading={loading}
          height={350}
        />

        <ExecutionTrendChart
          data={trend}
          title="执行趋势（面积图）"
          chartType="area"
          loading={loading}
          height={350}
        />
      </div>

      <ExecutionTrendChart
        data={trend}
        title="执行趋势（柱状图）"
        chartType="bar"
        loading={loading}
        height={350}
      />

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>WorkflowStatsCard</strong>: 显示工作流的关键指标，包括总执行次数、成功率和平均执行时间</p>
          <p>• <strong>ExecutionTrendChart</strong>: 支持三种图表类型（折线图、面积图、柱状图）展示执行趋势</p>
          <p>• <strong>useAnalytics Hook</strong>: 提供数据获取和状态管理，支持自动刷新</p>
          <p>• <strong>AnalyticsService</strong>: 封装 API 调用，提供错误处理和默认值</p>
        </CardContent>
      </Card>
    </div>
  )
}