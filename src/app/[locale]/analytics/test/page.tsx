/**
 * Analytics Module Quick Test
 * 测试分析和导出功能
 */

import {
  AnalyticsChart,
  AnalyticsDashboard,
  DateRangePicker,
  FilterPanel,
  MetricCard
} from '@/components/analytics';
import type {
  AnalyticsMetrics,
  AnalyticsFilters,
  TimeSeriesDataPoint,
  TimeRange,
  Statistic
} from '@/lib/types/analytics';

// Test type definitions
const testTimeRange: TimeRange = 'week';
const testFilters: AnalyticsFilters = {
  timeRange: 'week',
  metrics: ['agents', 'users', 'tasks']
};
const testTimeSeries: TimeSeriesDataPoint[] = [
  { timestamp: '2026-03-15T00:00:00Z', date: 'Mar 15', agents: 10, users: 50, tasks: 20 },
  { timestamp: '2026-03-16T00:00:00Z', date: 'Mar 16', agents: 11, users: 55, tasks: 25 }
];

export default function AnalyticsTestPage() {
  return (
    <AnalyticsDashboard locale="en" defaultTimeRange="week" />
  );
}
