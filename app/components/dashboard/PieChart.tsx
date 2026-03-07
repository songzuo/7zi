'use client';

/**
 * 饼图组件
 * 使用纯 CSS 实现的饼图
 */

import React, { memo, useMemo } from 'react';

interface PieChartItem {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartItem[];
  size?: number;
  showLegend?: boolean;
  title?: string;
}

const PieChart = memo(function PieChart({
  data,
  size = 120,
  showLegend = true,
  title,
}: PieChartProps) {
  // 计算总值和百分比
  const { total, itemsWithPercent } = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const itemsWithPercent = data.map((item) => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    }));
    return { total, itemsWithPercent };
  }, [data]);

  // 生成 conic-gradient
  const gradient = useMemo(() => {
    if (itemsWithPercent.length === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
    
    let currentPercent = 0;
    const stops = itemsWithPercent.map((item) => {
      const start = currentPercent;
      currentPercent += item.percent;
      return `${item.color} ${start}% ${currentPercent}%`;
    });
    
    return `conic-gradient(${stops.join(', ')})`;
  }, [itemsWithPercent]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        暂无数据
      </div>
    );
  }

  return (
    <div>
      {title && (
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h4>
      )}
      
      <div className="flex items-center gap-4">
        {/* 饼图 */}
        <div
          className="rounded-full shadow-lg flex-shrink-0"
          style={{
            width: size,
            height: size,
            background: gradient,
          }}
          role="img"
          aria-label={title || '饼图'}
        >
          {/* 中心圆（可选的甜甜圈效果） */}
          <div
            className="rounded-full bg-white dark:bg-gray-800 flex items-center justify-center"
            style={{
              width: size * 0.5,
              height: size * 0.5,
              margin: size * 0.25,
            }}
          >
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {total}
            </span>
          </div>
        </div>

        {/* 图例 */}
        {showLegend && (
          <div className="space-y-2">
            {itemsWithPercent.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {item.label}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.value} ({item.percent.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default PieChart;
