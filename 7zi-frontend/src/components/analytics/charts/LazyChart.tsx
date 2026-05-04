'use client'

/**
 * LazyChart - 动态导入的图表包装器
 * 
 * 使用 next/dynamic 实现 recharts 的懒加载，减少初始 bundle 大小
 */

import dynamic from 'next/dynamic'
import { ComponentProps, Suspense } from 'react'
import { cn } from '@/lib/utils'

// Loading skeleton
function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-muted/20 rounded-lg', className)}>
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  )
}

// Dynamic imports for each chart component
export const LazyMetricChart = dynamic(
  () => import('@/features/dashboard/components/MetricChart').then(mod => mod.MetricChart),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">图表加载失败</div>
      return <ChartSkeleton className="h-[300px]" />
    }
  }
)

export const LazyExecutionTrendChart = dynamic(
  () => import('../ExecutionTrendChart').then(mod => ({
    default: mod.ExecutionTrendChart
  })),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">图表加载失败</div>
      return <ChartSkeleton className="h-[300px]" />
    }
  }
)

export const LazyResourceUsageChart = dynamic(
  () => import('./ResourceUsageChart').then(mod => ({
    default: mod.ResourceUsageChart
  })),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">图表加载失败</div>
      return <ChartSkeleton className="h-[300px]" />
    }
  }
)

export const LazyNodePerformanceChart = dynamic(
  () => import('./NodePerformanceChart').then(mod => ({
    default: mod.NodePerformanceChart
  })),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) return <div className="text-red-500 p-4">图表加载失败</div>
      return <ChartSkeleton className="h-[300px]" />
    }
  }
)

// Re-export types
export type { TrendData } from '@/lib/analytics/service'
export type { ResourceUsageData, NodePerformanceData } from '@/lib/analytics/types'
