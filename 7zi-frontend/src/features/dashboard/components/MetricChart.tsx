'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatTimestamp, formatNumber } from '../utils/format';
import { AggregatedMetricDataPoint, MetricDefinition, ChartConfig } from '../types/dashboard';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MetricChartProps {
  data: AggregatedMetricDataPoint[];
  metricDefinition: MetricDefinition;
  config: ChartConfig;
  loading?: boolean;
  className?: string;
}

export function MetricChart({
  data,
  metricDefinition,
  config,
  loading = false,
  className = '',
}: MetricChartProps) {
  const { chartType, aggregation } = config;

  // Format data for Recharts
  const chartData = useMemo(() => {
    return data.map((point) => {
      const value = aggregation && point[aggregation as keyof AggregatedMetricDataPoint]
        ? (point[aggregation as keyof AggregatedMetricDataPoint] as number)
        : point.avg;

      return {
        timestamp: point.timestamp * 1000,
        time: format(new Date(point.timestamp * 1000), 'MM-dd HH:mm', { locale: zhCN }),
        value: Number(value.toFixed(2)),
        min: point.min,
        max: point.max,
      };
    });
  }, [data, aggregation]);

  // Get aggregation display name
  const getAggregationLabel = (): string => {
    const labels: Record<string, string> = {
      avg: '平均',
      sum: '总和',
      min: '最小',
      max: '最大',
      p50: 'P50',
      p90: 'P90',
      p95: 'P95',
      p99: 'P99',
    };
    return labels[aggregation || metricDefinition.aggregation] || '';
  };

  const ChartComponent = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'bar' ? Bar : chartType === 'area' ? Area : Line;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {metricDefinition.displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {metricDefinition.description} {getAggregationLabel() && `· ${getAggregationLabel()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {metricDefinition.unit}
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        /* Chart */
        <ResponsiveContainer width="100%" height={config.height || 300}>
          <ChartComponent data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="time"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => formatNumber(value, { decimals: 1 })}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#f9fafb',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#f9fafb', marginBottom: '8px' }}
              formatter={(value: number) => [formatNumber(value), metricDefinition.displayName]}
            />
            {data.length > 1 && (
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
            )}
            <DataComponent
              type="monotone"
              dataKey="value"
              name={getAggregationLabel() || metricDefinition.displayName}
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
            />
            {/* Min/Max range for area charts */}
            {chartType === 'area' && chartData.some(d => d.min !== d.max) && (
              <>
                <Line
                  type="monotone"
                  dataKey="min"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="最小值"
                  hide
                />
                <Line
                  type="monotone"
                  dataKey="max"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="最大值"
                  hide
                />
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default MetricChart;