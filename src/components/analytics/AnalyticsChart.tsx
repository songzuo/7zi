/**
 * Analytics Chart Component
 * 数据分析图表组件 (支持 Recharts)
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Download,
  TrendingUp
} from 'lucide-react';
import { type ChartConfig, type TimeSeriesDataPoint, type ChartType } from '@/lib/types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnalyticsChartProps {
  config: ChartConfig;
  onExport?: (format: 'csv' | 'xlsx' | 'json') => void;
  className?: string;
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16'  // lime
];

// ============================================================================
// Chart Type Icons
// ============================================================================

const chartTypeIcons: Record<ChartType, React.ElementType> = {
  line: LineChartIcon,
  area: TrendingUp,
  bar: BarChart3,
  pie: PieChartIcon,
  donut: PieChartIcon,
  radar: Activity,
  scatter: Activity,
  heatmap: Activity
};

// ============================================================================
// Custom Tooltip
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey?: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 p-3 min-w-[150px]">
        {label && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
            {label}
          </p>
        )}
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-600 dark:text-zinc-300">{entry.name}:</span>
            <span className="font-semibold text-zinc-900 dark:text-white ml-auto">
              {entry.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// Custom Legend
// ============================================================================

const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      {payload.map((entry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Value Formatter
// ============================================================================

const formatValue = (value: number, metric: string): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  config,
  onExport,
  className = ''
}) => {
  const { type, title, data, metrics, colors = COLORS, showLegend = true, showTooltip = true, height = 300 } = config;
  const [activeChartType, setActiveChartType] = useState<ChartType>(type);

  const chartColors = useMemo(() => {
    return metrics.map((_, index) => colors[index % colors.length]);
  }, [metrics, colors]);

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayDate: item.date || new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [data]);

  const StatIcon = chartTypeIcons[activeChartType] as React.ComponentType<{ className?: string }>;

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    };

    switch (activeChartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={(value) => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={chartColors[index]}
                strokeWidth={2}
                dot={{ fill: chartColors[index], r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={(value) => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Area
                key={metric}
                type="monotone"
                dataKey={metric}
                name={metric}
                stroke={chartColors[index]}
                fill={chartColors[index]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <XAxis
              dataKey="displayDate"
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={(value) => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {metrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metric}
                name={metric}
                fill={chartColors[index]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
      case 'donut':
        // Aggregate data for pie chart
        const pieData = metrics.map((metric, index) => ({
          name: metric,
          value: data.reduce((sum, item) => sum + (Number(item[metric]) || 0), 0),
          fill: chartColors[index]
        }));

        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              innerRadius={activeChartType === 'donut' ? 60 : 0}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
            <PolarGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
            <PolarAngleAxis dataKey="displayDate" className="text-xs text-zinc-500 dark:text-zinc-400" />
            <PolarRadiusAxis
              className="text-xs text-zinc-500 dark:text-zinc-400"
              tickFormatter={(value) => formatValue(value, 'default')}
              tick={{ fontSize: 12 }}
            />
            {metrics.map((metric, index) => (
              <Radar
                key={metric}
                name={metric}
                dataKey={metric}
                stroke={chartColors[index]}
                fill={chartColors[index]}
                fillOpacity={0.3}
              />
            ))}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </RadarChart>
        );

      default:
        return <div className="flex items-center justify-center h-full text-zinc-500">Unsupported chart type</div>;
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <StatIcon className="w-5 h-5 text-purple-600" />
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 rounded-lg p-1">
            {(['line', 'area', 'bar', 'pie', 'radar'] as ChartType[]).map((chartTypeOption) => {
              const Icon = chartTypeIcons[chartTypeOption] as React.ComponentType<{ className?: string }>;
              return (
                <button
                  key={chartTypeOption}
                  onClick={() => setActiveChartType(chartTypeOption)}
                  className={`p-2 rounded-lg transition-colors ${
                    activeChartType === chartTypeOption
                      ? 'bg-white dark:bg-zinc-600 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title={chartTypeOption}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Export Button */}
          {onExport && (
            <div className="relative group">
              <button className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors">
                <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {['csv', 'xlsx', 'json'].map((format) => (
                  <button
                    key={format}
                    onClick={() => onExport(format as 'csv' | 'xlsx' | 'json')}
                    className="block w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsChart;
