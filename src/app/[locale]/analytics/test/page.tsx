/**
 * Analytics Module Quick Test
 * 测试分析和导出功能
 */

import { AnalyticsDashboard } from '@/components/analytics'

export default function AnalyticsTestPage() {
  return <AnalyticsDashboard locale="en" defaultTimeRange="week" />
}
