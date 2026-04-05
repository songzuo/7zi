/**
 * Analytics Dashboard Page
 *
 * Main analytics dashboard page for monitoring workflows and system performance.
 */

import { AnalyticsDashboard } from '@/components/analytics/dashboard/AnalyticsDashboard'
import { analyticsService } from '@/lib/analytics/service'

/**
 * Analytics Page
 * Server component that fetches initial data
 */
export default async function AnalyticsPage() {
  // Fetch initial data on the server
  const initialData = await analyticsService.getAllMetrics()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">数据分析</h1>
          <p className="text-muted-foreground mt-1">
            实时监控工作流执行和系统性能
          </p>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        initialData={initialData}
        autoRefresh={true}
        refreshInterval={30000}
      />
    </div>
  )
}