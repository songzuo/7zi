'use client';

import { useEffect, useState } from 'react';
import TimeRangeSelector from './TimeRangeSelector';
import StatCard from './StatCard';
import MetricChart from './MetricChart';
import { dashboardApi, getDashboardConfig, getMetricDefinition } from '../services/dashboard-api';
import {
  TimeRange,
  DashboardConfig,
  StatCardData,
  ChartData,
  MetricDataPoint,
} from '../types/dashboard';
import { calculateChangeRate } from '../utils/format';

interface DashboardStats {
  workflow: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
  user: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [config] = useState<DashboardConfig>(getDashboardConfig());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<Record<string, ChartData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all data in parallel
      const [workflowStats, userStats, performanceStats, systemStats] = await Promise.all([
        dashboardApi.getWorkflowStats(timeRange),
        dashboardApi.getUserActivityStats(timeRange),
        dashboardApi.getPerformanceStats(timeRange),
        dashboardApi.getSystemStats(timeRange),
      ]);

      setStats({
        workflow: workflowStats,
        user: userStats,
        performance: performanceStats,
        system: systemStats,
      });

      // Load chart data
      const chartPromises = config.layout.charts.map(async (chartConfig) => {
        const metricDef = getMetricDefinition(chartConfig.metricName);
        if (!metricDef) return null;

        try {
          const aggregatedData = await dashboardApi.getAggregatedMetrics(
            chartConfig.metricName,
            timeRange
          );

          return {
            metricName: chartConfig.metricName,
            metricDefinition: metricDef,
            data: aggregatedData,
            timeRange,
          };
        } catch (err) {
          console.error(`Error loading chart data for ${chartConfig.metricName}:`, err);
          return null;
        }
      });

      const chartResults = await Promise.all(chartPromises);
      const chartDataMap: Record<string, ChartData> = {};

      chartResults.forEach((result) => {
        if (result) {
          chartDataMap[result.metricName] = result;
        }
      });

      setChartData(chartDataMap);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when time range changes
  useEffect(() => {
    loadData();
  }, [timeRange]);

  // Auto-refresh
  useEffect(() => {
    if (config.refreshInterval > 0) {
      const interval = setInterval(() => {
        loadData();
      }, config.refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [config.refreshInterval, timeRange]);

  // Get stat card data from stats
  const getStatCardData = (metricName: string, aggregation?: string): StatCardData | null => {
    if (!stats) return null;

    const metricDef = getMetricDefinition(metricName);
    if (!metricDef) return null;

    const category = metricDef.category;
    let value = 0;
    let change: number | undefined;
    let changeType: 'increase' | 'decrease' | undefined;
    let trend: MetricDataPoint[] | undefined;

    switch (metricName) {
      case 'workflow.executions_total':
        value = stats.workflow.total;
        break;
      case 'workflow.executions_success':
        value = stats.workflow.success;
        break;
      case 'workflow.executions_failed':
        value = stats.workflow.failed;
        break;
      case 'user.active_users':
        value = stats.user.activeUsers;
        trend = chartData[metricName]?.data.map((d) => ({
          timestamp: d.timestamp,
          value: d.avg,
        }));
        break;
      case 'user.new_users':
        value = stats.user.newUsers;
        break;
      case 'app.response_time':
        value = stats.performance.responseTime;
        break;
      case 'app.throughput':
        value = stats.performance.throughput;
        break;
      case 'app.error_rate':
        value = stats.performance.errorRate;
        break;
      case 'system.cpu_usage':
        value = stats.system.cpu;
        break;
      case 'system.memory_usage':
        value = stats.system.memory;
        break;
      case 'system.disk_usage':
        value = stats.system.disk;
        break;
      default:
        return null;
    }

    // Calculate change (mock for now)
    if (trend && trend.length > 0) {
      const prevValue = trend[Math.max(0, trend.length - 10)].value;
      const changeResult = calculateChangeRate(value, prevValue);
      change = changeResult.value;
      changeType = changeResult.type;
    }

    return {
      title: metricDef.displayName,
      value,
      unit: metricDef.unit,
      change,
      changeType,
      trend,
      category,
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {config.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {config.description}
              </p>
            </div>
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {config.layout.stats.map((statConfig) => {
            const cardData = getStatCardData(statConfig.metricName, statConfig.aggregation);
            if (!cardData) return null;

            return (
              <div key={statConfig.metricName} className={statConfig.width === 3 ? 'md:col-span-3' : ''}>
                <StatCard
                  {...cardData}
                  loading={loading}
                  showTrend={statConfig.showTrend}
                />
              </div>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {config.layout.charts.map((chartConfig) => {
            const data = chartData[chartConfig.metricName];
            const metricDef = getMetricDefinition(chartConfig.metricName);

            if (!metricDef) return null;

            return (
              <div
                key={chartConfig.metricName}
                className={chartConfig.width === 12 ? 'lg:col-span-2' : ''}
              >
                <MetricChart
                  data={data?.data || []}
                  metricDefinition={metricDef}
                  config={chartConfig}
                  loading={loading}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;