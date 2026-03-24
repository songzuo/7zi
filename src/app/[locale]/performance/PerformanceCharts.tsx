'use client';

/**
 * Performance Charts Component
 * 拆分出来的图表组件，用于懒加载优化 bundle 大小
 */

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TimeSeriesData {
  timestamp: number;
  value: number;
}

interface PerformanceChartsProps {
  data: TimeSeriesData[];
  chartType: 'line' | 'bar' | 'area';
  xKey: string;
  yKey: string;
  color?: string;
  name?: string;
}

function PerformanceChartsComponent({ data, chartType, xKey, yKey, color = '#3b82f6', name }: PerformanceChartsProps) {
  // 生成渐变定义
  const gradientId = useMemo(() => `gradient-${name || 'default'}`, [name]);

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            dataKey={xKey}
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            stroke="currentColor"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          />
          <YAxis stroke="currentColor" className="text-xs fill-gray-600 dark:fill-gray-400" />
          <Tooltip
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value) => {
              const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
              return [`${numValue.toFixed(2)}`, name || 'Value'];
            }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      );
    }

    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
}

export default PerformanceChartsComponent;