/**
 * Analytics Dashboard Component
 * 数据分析仪表盘主组件
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, LayoutGrid, Settings, Save, RotateCcw } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { FilterPanel } from './FilterPanel';
import { MetricCard } from './MetricCard';
import { AnalyticsChart } from './AnalyticsChart';
import { Activity, Users, CheckCircle, DollarSign, Cpu, AlertCircle } from 'lucide-react';
import {
  type AnalyticsMetrics,
  type AnalyticsFilters,
  type TimeSeriesDataPoint,
  type Statistic,
  type DashboardLayout,
  TimeRange,
  ExportFormat
} from '@/lib/types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnalyticsDashboardProps {
  locale?: string;
  defaultTimeRange?: TimeRange;
  refreshInterval?: number;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Default Layout',
  isDefault: true,
  columns: 12,
  widgets: [
    {
      id: 'stat-agents',
      type: 'stat-card',
      title: 'Total Agents',
      position: { x: 0, y: 0, w: 3, h: 1 },
      config: {}
    },
    {
      id: 'stat-users',
      type: 'stat-card',
      title: 'Active Users',
      position: { x: 3, y: 0, w: 3, h: 1 },
      config: {}
    },
    {
      id: 'stat-tasks',
      type: 'stat-card',
      title: 'Tasks Completed',
      position: { x: 6, y: 0, w: 3, h: 1 },
      config: {}
    },
    {
      id: 'stat-revenue',
      type: 'stat-card',
      title: 'Total Revenue',
      position: { x: 9, y: 0, w: 3, h: 1 },
      config: {}
    },
    {
      id: 'chart-activity',
      type: 'chart',
      title: 'Activity Overview',
      position: { x: 0, y: 1, w: 8, h: 3 },
      config: {}
    },
    {
      id: 'chart-revenue',
      type: 'chart',
      title: 'Revenue Trend',
      position: { x: 8, y: 1, w: 4, h: 3 },
      config: {}
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  locale = 'en',
  defaultTimeRange = 'week',
  refreshInterval = 30000,
  className = ''
}) => {
  // State
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesDataPoint[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: defaultTimeRange,
    metrics: ['agents', 'users', 'tasks', 'tokens', 'revenue', 'errors']
  });
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Load saved layout
  useEffect(() => {
    const savedLayout = localStorage.getItem('analytics-layout');
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    }
  }, []);

  // Save layout
  const saveLayout = useCallback(() => {
    localStorage.setItem('analytics-layout', JSON.stringify(layout));
  }, [layout]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });

      const result = await response.json();
      if (result.success) {
        setMetrics(result.data.metrics);
        setTimeSeries(result.data.timeSeries);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Export data
  const handleExport = useCallback(async (format: ExportFormat) => {
    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          data: timeSeries,
          filename: `analytics-export-${filters.timeRange}`,
          filters,
          dateRange: filters.customRange
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Export failed:', error);
      }
    }
  }, [timeSeries, filters]);

  // Create statistics from metrics
  const createStatistics = (): Statistic[] => {
    if (!metrics) return [];

    return [
      {
        label: locale === 'zh' ? '活跃代理' : 'Active Agents',
        value: metrics.agents.active,
        format: 'number',
        change: {
          value: 12.5,
          period: locale === 'zh' ? '上周' : 'last week',
          type: 'increase'
        }
      },
      {
        label: locale === 'zh' ? '活跃用户' : 'Active Users',
        value: metrics.users.activeWeek,
        format: 'number',
        change: {
          value: 8.3,
          period: locale === 'zh' ? '上周' : 'last week',
          type: 'increase'
        }
      },
      {
        label: locale === 'zh' ? '已完成任务' : 'Tasks Completed',
        value: metrics.tasks.completed,
        format: 'number',
        change: {
          value: 15.2,
          period: locale === 'zh' ? '上周' : 'last week',
          type: 'increase'
        }
      },
      {
        label: locale === 'zh' ? '总收入' : 'Total Revenue',
        value: metrics.revenue.total,
        format: 'currency',
        change: {
          value: 22.1,
          period: locale === 'zh' ? '上月' : 'last month',
          type: 'increase'
        }
      }
    ];
  };

  const statistics = createStatistics();

  const icons = [Activity, Users, CheckCircle, DollarSign];

  const t = {
    title: locale === 'zh' ? '数据分析' : 'Analytics Dashboard',
    refresh: locale === 'zh' ? '刷新' : 'Refresh',
    export: locale === 'zh' ? '导出' : 'Export',
    autoRefresh: locale === 'zh' ? '自动刷新' : 'Auto Refresh',
    lastUpdated: locale === 'zh' ? '最后更新' : 'Last Updated',
    loading: locale === 'zh' ? '加载中...' : 'Loading...',
    saveLayout: locale === 'zh' ? '保存布局' : 'Save Layout',
    resetLayout: locale === 'zh' ? '重置布局' : 'Reset Layout'
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-600" />
            {t.title}
          </h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t.lastUpdated}: {lastUpdated.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Picker */}
          <DateRangePicker
            selectedRange={filters.timeRange}
            customRange={filters.customRange}
            onChange={(range, customRange) => setFilters({ ...filters, timeRange: range, customRange })}
            locale={locale}
          />

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            title={t.export}
          >
            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export */}
          <button
            onClick={() => handleExport('csv')}
            className="p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            title={t.export}
          >
            <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Save Layout */}
          <button
            onClick={saveLayout}
            className="p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
            title={t.saveLayout}
          >
            <Save className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">{t.autoRefresh}</span>
          </label>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            locale={locale}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && !metrics && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t.loading}</p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statistics.map((stat, index) => (
          <MetricCard
            key={stat.label}
            statistic={stat}
            icon={icons[index]}
            color={index === 0 ? 'blue' : index === 1 ? 'green' : index === 2 ? 'purple' : 'orange'}
            loading={loading}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <AnalyticsChart
          config={{
            type: 'area',
            title: locale === 'zh' ? '活动概览' : 'Activity Overview',
            data: timeSeries,
            metrics: filters.metrics?.slice(0, 4) || ['agents', 'users', 'tasks'],
            showLegend: true,
            showTooltip: true,
            height: 350
          }}
          onExport={handleExport}
        />

        {/* Revenue Chart */}
        <AnalyticsChart
          config={{
            type: 'line',
            title: locale === 'zh' ? '收入趋势' : 'Revenue Trend',
            data: timeSeries,
            metrics: ['revenue'],
            showLegend: true,
            showTooltip: true,
            height: 350
          }}
          onExport={handleExport}
        />
      </div>

      {/* Performance Chart */}
      <AnalyticsChart
        config={{
          type: 'bar',
          title: locale === 'zh' ? 'Token 使用趋势' : 'Token Usage Trend',
          data: timeSeries,
          metrics: ['tokens', 'errors'],
          showLegend: true,
          showTooltip: true,
          height: 300
        }}
        onExport={handleExport}
      />

      {/* Footer */}
      {metrics && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">{locale === 'zh' ? '任务完成率' : 'Task Completion Rate'}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.tasks.completionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{locale === 'zh' ? '系统正常运行时间' : 'System Uptime'}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.performance.uptime.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{locale === 'zh' ? '缓存命中率' : 'Cache Hit Rate'}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.performance.cacheHitRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">{locale === 'zh' ? '错误率' : 'Error Rate'}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.performance.errorRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
rd;
