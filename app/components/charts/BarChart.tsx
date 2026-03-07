'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChartDataPoint, ChartContainer, ChartLegend, CHART_COLORS } from './Chart';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_HEIGHT = 300;
const DEFAULT_GROUPED_HEIGHT = 350;
const GRID_LINES_COUNT = 5;
const BAR_WIDTH_RATIO = 0.7;
const BAR_GAP_RATIO = 0.3;

interface BarChartProps {
  data: ChartDataPoint[];
  title: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  animate?: boolean;
}

/**
 * BarChart 组件 - 柱状图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 * 4. 常量配置外部化 - 减少每次渲染的对象创建
 */
function BarChartComponent({
  data,
  title,
  subtitle,
  height = DEFAULT_HEIGHT,
  showLegend = false,
  horizontal = false,
  animate = true,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 性能优化: useMemo 缓存统计值计算
  const { maxValue, total } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value));
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return { maxValue: max || 1, total: sum };
  }, [data]);

  // 性能优化: useMemo 缓存图表配置
  const chartConfig = useMemo(() => ({
    width: horizontal ? 500 : 400,
    height,
    padding: { top: 20, right: 30, bottom: horizontal ? 60 : 40, left: horizontal ? 80 : 60 },
  }), [height, horizontal]);

  const chartWidth = chartConfig.width - chartConfig.padding.left - chartConfig.padding.right;
  const chartHeight = chartConfig.height - chartConfig.padding.top - chartConfig.padding.bottom;

  // 性能优化: useMemo 缓存 Y 轴标签
  const yLabels = useMemo(() => [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0
  ], [maxValue]);

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // 性能优化: useMemo 缓存柱状图数据
  const barData = useMemo(() => {
    return data.map((item, index) => {
      const barWidth = chartWidth / data.length * BAR_WIDTH_RATIO;
      const gap = chartWidth / data.length * BAR_GAP_RATIO;
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = chartConfig.padding.left + (chartWidth / data.length) * index + gap / 2;
      const y = chartConfig.padding.top + chartHeight - barHeight;
      const color = item.color || CHART_COLORS.blue;

      return {
        x,
        y,
        barWidth,
        barHeight,
        color,
        value: item.value,
        label: item.label,
        index,
      };
    });
  }, [data, chartWidth, chartHeight, chartConfig, maxValue]);

  // 性能优化: useMemo 缓存图例项
  const legendItems = useMemo(() => 
    data.map((d) => ({ label: d.label, color: d.color || CHART_COLORS.blue })),
    [data]
  );

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {yLabels.map((_, i) => (
          <line
            key={i}
            x1={chartConfig.padding.left}
            y1={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={chartConfig.padding.left - 10}
            y={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-gray-500 dark:fill-gray-400 text-xs"
          >
            {label}
          </text>
        ))}

        {/* Bars */}
        {barData.map((bar) => (
          <g key={bar.index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.barWidth}
              height={bar.barHeight}
              fill={bar.color}
              rx={4}
              className={`transition-all duration-300 ${animate ? 'animate-grow-up' : ''} ${
                hoveredIndex === bar.index ? 'opacity-100 brightness-110' : 'opacity-90'
              }`}
              onMouseEnter={() => handleMouseEnter(bar.index)}
              onMouseLeave={handleMouseLeave}
              style={{
                transformOrigin: `${bar.x + bar.barWidth / 2}px ${chartConfig.padding.top + chartHeight}px`,
              }}
            />
            {/* Value label on hover */}
            {hoveredIndex === bar.index && (
              <text
                x={bar.x + bar.barWidth / 2}
                y={bar.y - 8}
                textAnchor="middle"
                className="fill-gray-900 dark:fill-white text-sm font-semibold"
              >
                {bar.value}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={bar.x + bar.barWidth / 2}
              y={chartConfig.height - chartConfig.padding.bottom + 20}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400 text-xs"
            >
              {bar.label.length > 8 ? bar.label.slice(0, 8) + '...' : bar.label}
            </text>
          </g>
        ))}
      </svg>

      {showLegend && (
        <ChartLegend items={legendItems} position="bottom" />
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">总计</span>
        <span className="font-semibold text-gray-900 dark:text-white">{total}</span>
      </div>

      <style jsx>{`
        @keyframes grow-up {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }
        .animate-grow-up {
          animation: grow-up 0.5s ease-out forwards;
        }
      `}</style>
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const BarChart = memo(BarChartComponent);

// ===== Grouped Bar Chart =====
interface GroupedBarChartProps {
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  title: string;
  subtitle?: string;
  height?: number;
}

/**
 * GroupedBarChart 组件 - 分组柱状图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和布局 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 */
function GroupedBarChartComponent({ categories, series, title, subtitle, height = DEFAULT_GROUPED_HEIGHT }: GroupedBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<{ catIndex: number; seriesIndex: number } | null>(null);

  // 性能优化: useMemo 缓存最大值计算
  const maxValue = useMemo(() => {
    const allValues = series.flatMap((s) => s.data);
    return Math.max(...allValues) || 1;
  }, [series]);

  // 性能优化: useMemo 缓存图表配置
  const chartConfig = useMemo(() => ({
    width: 500,
    height,
    padding: { top: 30, right: 30, bottom: 60, left: 60 },
  }), [height]);

  const chartWidth = chartConfig.width - chartConfig.padding.left - chartConfig.padding.right;
  const chartHeight = chartConfig.height - chartConfig.padding.top - chartConfig.padding.bottom;
  const groupWidth = chartWidth / categories.length;
  const barWidth = (groupWidth * 0.8) / series.length;

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((catIndex: number, seriesIndex: number) => {
    setHoveredBar({ catIndex, seriesIndex });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredBar(null);
  }, []);

  // 性能优化: useMemo 缓存 Y 轴标签
  const yLabels = useMemo(() => [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0
  ], [maxValue]);

  // 性能优化: useMemo 缓存图例项
  const legendItems = useMemo(() => 
    series.map((s) => ({ label: s.name, color: s.color || CHART_COLORS.blue })),
    [series]
  );

  // 性能优化: useMemo 缓存柱状图位置数据
  const barsData = useMemo(() => {
    return categories.map((category, catIndex) => ({
      category,
      catIndex,
      bars: series.map((s, seriesIndex) => ({
        barHeight: (s.data[catIndex] / maxValue) * chartHeight,
        x: chartConfig.padding.left + groupWidth * catIndex + (groupWidth * 0.1) + barWidth * seriesIndex,
        y: chartConfig.padding.top + chartHeight - (s.data[catIndex] / maxValue) * chartHeight,
        color: s.color || CHART_COLORS.blue,
        seriesIndex,
        catIndex,
      })),
    }));
  }, [categories, series, maxValue, chartConfig, chartHeight, groupWidth, barWidth]);

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {Array.from({ length: GRID_LINES_COUNT }).map((_, i) => (
          <line
            key={i}
            x1={chartConfig.padding.left}
            y1={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={chartConfig.padding.left - 10}
            y={chartConfig.padding.top + (chartHeight / (GRID_LINES_COUNT - 1)) * i}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-gray-500 dark:fill-gray-400 text-xs"
          >
            {label}
          </text>
        ))}

        {/* Bars */}
        {barsData.map((group) => (
          <g key={group.catIndex}>
            {group.bars.map((bar) => {
              const isHovered =
                hoveredBar?.catIndex === bar.catIndex && hoveredBar?.seriesIndex === bar.seriesIndex;

              return (
                <rect
                  key={bar.seriesIndex}
                  x={bar.x}
                  y={bar.y}
                  width={barWidth - 2}
                  height={bar.barHeight}
                  fill={bar.color}
                  rx={3}
                  className={`transition-all duration-200 ${isHovered ? 'brightness-110' : 'opacity-90'}`}
                  onMouseEnter={() => handleMouseEnter(bar.catIndex, bar.seriesIndex)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
            {/* Category label */}
            <text
              x={chartConfig.padding.left + groupWidth * group.catIndex + groupWidth / 2}
              y={chartConfig.height - chartConfig.padding.bottom + 20}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400 text-xs"
            >
              {group.category.length > 8 ? group.category.slice(0, 8) + '...' : group.category}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <ChartLegend items={legendItems} position="bottom" />
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const GroupedBarChart = memo(GroupedBarChartComponent);