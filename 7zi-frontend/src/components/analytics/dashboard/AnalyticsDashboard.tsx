/**
 * AnalyticsDashboard - 主分析仪表板
 *
 * 完整的分析仪表板，包含所有图表和指标。
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { KPIDashboard } from './KPIDashboard'
import { ExecutionTrendChart } from '../ExecutionTrendChart'
import { NodePerformanceChart } from '../charts/NodePerformanceChart'
import { ResourceUsageChart } from '../charts/ResourceUsageChart'
import { AnomalyChart } from '../charts/AnomalyChart'
import { RealTimeStream } from '../realtime/RealTimeStream'
import { analyticsService } from '@/lib/analytics/service'
import type { AnalyticsMetrics, OverviewMetrics, WorkflowTrendData, NodePerformanceData, ResourceUsageData, AnomalyData } from '@/lib/analytics/types'

export interface AnalyticsDashboardProps {
  initialData?: AnalyticsMetrics
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
  className?: string
}

interface LoadingState {
  overview: boolean
  trends: boolean
  nodePerformance: boolean
  resourceUsage: boolean
  anomalies: boolean
}

/**
 * Default loading skeletons
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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
 * AnalyticsDashboard main component
 */
export function AnalyticsDashboard({
  initialData,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className,
}: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState<LoadingState>({
    overview: !initialData,
    trends: !initialData,
    nodePerformance: !initialData,
    resourceUsage: !initialData,
    anomalies: !initialData,
  })

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(initialData || null)

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const data = await analyticsService.getAllMetrics()

      setMetrics(data)
      setLoading({
        overview: false,
        trends: false,
        nodePerformance: false,
        resourceUsage: false,
        anomalies: false,
      })
    } catch (error) {
      console.error('[AnalyticsDashboard] Failed to fetch data:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!initialData) {
      fetchData()
    }
  }, [initialData, fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  // Loading state
  if (Object.values(loading).some(Boolean) && !metrics) {
    return <DashboardSkeleton />
  }

  // Error state
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">无法加载分析数据</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* KPI Dashboard */}
      <section>
        <KPIDashboard metrics={metrics.overview} />
      </section>

      {/* Real-time Stream (optional) */}
      {autoRefresh && (
        <section>
          <RealTimeStream />
        </section>
      )}

      {/* Top Row: Workflow Trends & Node Performance */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ExecutionTrendChart
          data={metrics.workflowTrends.map(d => ({ date: d.date, value: d.total }))}
          title="工作流执行趋势"
          chartType="area"
          height={320}
        />
        <NodePerformanceChart
          data={metrics.nodePerformance}
          title="节点性能分析"
          height={320}
        />
      </section>

      {/* Middle Row: Resource Usage & Anomalies */}
      <section className="grid gap-6 lg:grid-cols-2">
        <ResourceUsageChart
          data={metrics.resourceUsage}
          title="资源使用情况"
          height={320}
        />
        <AnomalyChart
          data={metrics.anomalies}
          title="异常检测"
          height={320}
        />
      </section>

      {/* Bottom Row: Success Rate Trend */}
      <section>
        <ExecutionTrendChart
          data={metrics.workflowTrends.map(d => ({
            date: d.date,
            value: d.successRate,
          }))}
          title="成功率趋势"
          chartType="line"
          height={280}
        />
      </section>
    </div>
  )
}

// Helper function for class names
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export default AnalyticsDashboard
