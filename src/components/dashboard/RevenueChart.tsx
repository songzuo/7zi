'use client';

/**
 * RevenueChart - 收入趋势图组件
 * 
 * 使用 Recharts 显示收入随时间的变化趋势
 * 支持折线图和柱状图切换
 * 支持响应式设计和移动端友好
 */

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  costs?: number;
  profit?: number;
  target?: number;
}

export interface RevenueChartProps {
  data: RevenueDataPoint[];
  title?: string;
  subtitle?: string;
  color?: string;
  height?: number;
  showTarget?: boolean;
  showProfit?: boolean;
  locale?: string;
  className?: string;
}

// ============================================================================
// 自定义 Tooltip
// ============================================================================

const CustomTooltip = ({ active, payload, label, locale }: any) => {
  if (active && payload && payload.length) {
    const formatCurrency = (value: number) => {
      return locale === 'zh'
        ? `¥${value.toLocaleString()}`
        : `$${value.toLocaleString()}`;
    };

    return (
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// 组件实现
// ============================================================================

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = 'Revenue Trend',
  subtitle,
  color = '#3b82f6',
  height = 300,
  showTarget = false,
  showProfit = false,
  locale = 'en',
  className = ''
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // 根据时间范围过滤数据（模拟）
  const filteredData = data;

  // 计算总览统计
  const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = filteredData.length > 0 ? totalRevenue / filteredData.length : 0;
  const maxRevenue = Math.max(...filteredData.map(item => item.revenue), 0);
  const lastRevenue = filteredData[filteredData.length - 1]?.revenue || 0;

  // 格式化货币
  const formatCurrency = (value: number) => {
    return locale === 'zh'
      ? `¥${(value / 1000).toFixed(1)}k`
      : `$${(value / 1000).toFixed(1)}k`;
  };

  const formatCurrencyFull = (value: number) => {
    return locale === 'zh'
      ? `¥${value.toLocaleString()}`
      : `$${value.toLocaleString()}`;
  };

  // 切换图表类型
  const toggleChartType = () => {
    setChartType(prev => prev === 'line' ? 'bar' : 'line');
  };

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4 sm:p-6 ${className}`}>
      {/* 标题区域 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 时间范围选择 */}
          <div className="hidden sm:flex items-center bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white dark:bg-zinc-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* 图表类型切换 */}
          <button
            onClick={toggleChartType}
            className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
            title={chartType === 'line' ? 'Switch to Bar Chart' : 'Switch to Line Chart'}
          >
            {chartType === 'line' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
            {formatCurrencyFull(totalRevenue)}
          </p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Average</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
            {formatCurrencyFull(avgRevenue)}
          </p>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Peak</p>
          <p className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1">
            {formatCurrencyFull(maxRevenue)}
          </p>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Latest</p>
          <p className="text-lg font-bold text-orange-700 dark:text-orange-300 mt-1">
            {formatCurrencyFull(lastRevenue)}
          </p>
        </div>
      </div>

      {/* 图表 */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
              <XAxis
                dataKey="date"
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-gray-500 dark:text-gray-400"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip locale={locale} />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, r: 4 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
              />
              {showProfit && filteredData.some(d => d.profit !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {showTarget && filteredData.some(d => d.target !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-zinc-700" />
              <XAxis
                dataKey="date"
                className="text-xs text-gray-500 dark:text-gray-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-gray-500 dark:text-gray-400"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip locale={locale} />} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill={color} radius={[4, 4, 0, 0]} />
              {showProfit && filteredData.some(d => d.profit !== undefined) && (
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default RevenueChart;
