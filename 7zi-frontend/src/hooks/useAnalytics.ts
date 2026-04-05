/**
 * useAnalytics Hook - 数据分析自定义 Hook
 * 提供工作流统计数据和趋势数据的获取功能
 */

'use client'

import { useState, useEffect } from 'react'
import {
  analyticsService,
  type TimeRange,
  type WorkflowStats,
  type TrendData,
  type ExecutionDetail
} from '@/lib/analytics/service'

export interface UseAnalyticsOptions {
  enabled?: boolean
  refetchInterval?: number
}

export interface UseAnalyticsResult {
  stats: WorkflowStats | null
  trend: TrendData[]
  details: ExecutionDetail[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * 获取工作流分析数据的 Hook
 */
export function useAnalytics(
  workflowId: string,
  timeRange: TimeRange = '7d',
  trendDays: number = 7,
  options: UseAnalyticsOptions = {}
): UseAnalyticsResult {
  const { enabled = true, refetchInterval } = options

  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [trend, setTrend] = useState<TrendData[]>([])
  const [details, setDetails] = useState<ExecutionDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!enabled || !workflowId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 并行获取所有数据
      const [statsData, trendData, detailsData] = await Promise.all([
        analyticsService.getWorkflowStats(workflowId, timeRange),
        analyticsService.getExecutionTrend(workflowId, trendDays),
        analyticsService.getExecutionDetails(workflowId, timeRange, 50)
      ])

      setStats(statsData)
      setTrend(trendData)
      setDetails(detailsData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics data'))
      console.error('Error fetching analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [workflowId, timeRange, trendDays, enabled, refetchInterval])

  return {
    stats,
    trend,
    details,
    loading,
    error,
    refetch: fetchData
  }
}

/**
 * 获取工作流统计数据的独立 Hook
 */
export function useWorkflowStats(
  workflowId: string,
  timeRange: TimeRange = '7d',
  options: UseAnalyticsOptions = {}
) {
  const { enabled = true, refetchInterval } = options

  const [stats, setStats] = useState<WorkflowStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!enabled || !workflowId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await analyticsService.getWorkflowStats(workflowId, timeRange)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'))
      console.error('Error fetching workflow stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [workflowId, timeRange, enabled, refetchInterval])

  return { stats, loading, error, refetch: fetchData }
}

/**
 * 获取执行趋势数据的独立 Hook
 */
export function useExecutionTrend(
  workflowId: string,
  days: number = 7,
  options: UseAnalyticsOptions = {}
) {
  const { enabled = true, refetchInterval } = options

  const [trend, setTrend] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    if (!enabled || !workflowId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await analyticsService.getExecutionTrend(workflowId, days)
      setTrend(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch trend'))
      console.error('Error fetching execution trend:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    if (refetchInterval) {
      const interval = setInterval(fetchData, refetchInterval)
      return () => clearInterval(interval)
    }
  }, [workflowId, days, enabled, refetchInterval])

  return { trend, loading, error, refetch: fetchData }
}