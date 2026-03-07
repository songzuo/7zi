'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChartContainer, ChartLegend, TimeSeriesPoint, CHART_COLORS } from './Chart';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_HEIGHT = 300;
const DEFAULT_REALTIME_HEIGHT = 250;
const DEFAULT_MULTI_HEIGHT = 350;
const GRID_LINES_COUNT = 5;
const CHART_PADDING = { top: 30, right: 30, bottom: 60, left: 60 };
const REALTIME_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

// ===== Line Chart =====
interface LineChartProps {
  data: { label: string; value: number }[];
  title: string;
  subtitle?: string;
  height?: number;
  color?: string;
  showArea?: boolean;
  showPoints?: boolean;
  animate?: boolean;
}

/**
 * LineChart 组件 - 折线图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和路径 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 * 4. 常量配置外部化 - 减少每次渲染的对象创建
 */
function LineChartComponent({
  data,
  title,
  subtitle,
  height = DEFAULT_HEIGHT,
  color = CHART_COLORS.blue,
  showArea = true,
  showPoints = true,
  animate = true,
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 性能优化: useMemo 缓存统计值计算
  const { minValue, maxValue, total } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    return { minValue: Math.min(0, min), maxValue: max || 1, total: sum };
  }, [data]);

  // 性能优化: useMemo 缓存图表尺寸配置
  const chartConfig = useMemo(() => ({
    width: 500,
    height,
    padding: CHART_PADDING,
    chartWidth: 500 - CHART_PADDING.left - CHART_PADDING.right,
    chartHeight: height - CHART_PADDING.top - CHART_PADDING.bottom,
  }), [height]);

  // 性能优化: useMemo 缓存点位计算
  const points = useMemo(() => {
    const { padding, chartWidth, chartHeight } = chartConfig;
    return data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1 || 1)) * i,
      y: padding.top + chartHeight - ((d.value - minValue) / (maxValue - minValue || 1)) * chartHeight,
      value: d.value,
      label: d.label,
    }));
  }, [data, chartConfig, minValue, maxValue]);

  // 性能优化: useMemo 缓存路径计算
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      d += ` Q ${points[i - 1].x} ${points[i - 1].y} ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  }, [points]);

  // 性能优化: useMemo 缓存区域路径计算
  const areaD = useMemo(() => {
    if (!showArea || points.length === 0) return '';
    const { padding, chartHeight } = chartConfig;
    const yBase = padding.top + chartHeight;
    return `${pathD} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`;
  }, [pathD, showArea, points, chartConfig]);

  // 性能优化: useMemo 缓存 Y 轴标签
  const yLabels = useMemo(() => [
    maxValue,
    Math.round(((maxValue - minValue) * 0.75 + minValue)),
    Math.round(((maxValue - minValue) * 0.5 + minValue)),
    Math.round(((maxValue - minValue) * 0.25 + minValue)),
    minValue
  ], [maxValue, minValue]);

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // 性能优化: useMemo 缓存渐变 ID
  const gradientId = useMemo(() => `gradient-${title.replace(/\s+/g, '-')}`, [title]);

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
            y1={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
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
            y={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            textAnchor="end"
            alignmentBaseline="middle"
            className="fill-gray-500 dark:fill-gray-400 text-xs"
          >
            {label}
          </text>
        ))}

        {/* Area fill */}
        {showArea && areaD && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
        {showArea && areaD && (
          <path
            d={areaD}
            fill={`url(#${gradientId})`}
            className={animate ? 'animate-fade-in' : ''}
          />
        )}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? 'animate-draw-line' : ''}
          style={{ strokeDasharray: 1000, strokeDashoffset: animate ? 1000 : 0 }}
        />

        {/* Points */}
        {showPoints &&
          points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === i ? 6 : 4}
                fill={color}
                stroke="white"
                strokeWidth={2}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => handleMouseEnter(i)}
                onMouseLeave={handleMouseLeave}
              />
              {hoveredIndex === i && (
                <g>
                  <rect
                    x={point.x - 30}
                    y={point.y - 35}
                    width={60}
                    height={24}
                    fill="currentColor"
                    className="text-gray-900 dark:text-gray-700"
                    rx={4}
                  />
                  <text
                    x={point.x}
                    y={point.y - 18}
                    textAnchor="middle"
                    className="fill-white text-xs font-semibold"
                  >
                    {point.value}
                  </text>
                </g>
              )}
            </g>
          ))}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 10) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={i}
              x={chartConfig.padding.left + (chartConfig.chartWidth / (data.length - 1 || 1)) * i}
              y={chartConfig.height - chartConfig.padding.bottom + 20}
              textAnchor="middle"
              className="fill-gray-500 dark:text-gray-400 text-xs"
            >
              {d.label.length > 8 ? d.label.slice(0, 8) : d.label}
            </text>
          );
        })}
      </svg>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">最小值</div>
          <div className="font-semibold text-gray-900 dark:text-white">{minValue}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">最大值</div>
          <div className="font-semibold text-gray-900 dark:text-white">{maxValue}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">总计</div>
          <div className="font-semibold text-gray-900 dark:text-white">{total}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-draw-line {
          animation: draw-line 1s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const LineChart = memo(LineChartComponent);

// ===== Real-time Line Chart =====
interface RealtimeLineChartProps {
  title: string;
  data: TimeSeriesPoint[];
  height?: number;
  color?: string;
  maxPoints?: number;
  updateInterval?: number;
}

/**
 * RealtimeLineChart 组件 - 实时折线图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和点位 - 避免重复计算
 * 3. 常量配置外部化 - 减少每次渲染的对象创建
 */
function RealtimeLineChartComponent({
  title,
  data,
  height = DEFAULT_REALTIME_HEIGHT,
  color = CHART_COLORS.green,
}: RealtimeLineChartProps) {
  // 性能优化: useMemo 缓存统计值计算
  const { minValue, maxValue } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { minValue: Math.min(0, min), maxValue: max || 1 };
  }, [data]);

  // 性能优化: useMemo 缓存图表配置
  const chartConfig = useMemo(() => ({
    width: 400,
    height,
    padding: REALTIME_PADDING,
    chartWidth: 400 - REALTIME_PADDING.left - REALTIME_PADDING.right,
    chartHeight: height - REALTIME_PADDING.top - REALTIME_PADDING.bottom,
  }), [height]);

  // 性能优化: useMemo 缓存点位计算
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const { padding, chartWidth, chartHeight } = chartConfig;
    return data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1 || 1)) * i,
      y: padding.top + chartHeight - ((d.value - minValue) / (maxValue - minValue || 1)) * chartHeight,
      value: d.value,
    }));
  }, [data, chartConfig, minValue, maxValue]);

  // 性能优化: useMemo 缓存路径计算
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  }, [points]);

  // 性能优化: useMemo 缓存最新值
  const latestValue = useMemo(() => data[data.length - 1]?.value.toFixed(1) || '0', [data]);

  return (
    <ChartContainer
      title={title}
      actions={
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-600 dark:text-gray-400">实时</span>
        </div>
      }
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
      >
        {/* Grid */}
        {Array.from({ length: GRID_LINES_COUNT }).map((_, i) => (
          <line
            key={i}
            x1={chartConfig.padding.left}
            y1={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeDasharray="4,4"
          />
        ))}

        {/* Line */}
        {points.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Latest point */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        )}
      </svg>

      <div className="text-center mt-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{latestValue}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">当前值</span>
      </div>
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const RealtimeLineChart = memo(RealtimeLineChartComponent);

// ===== Multi-Line Chart =====
interface MultiLineChartProps {
  data: {
    name: string;
    values: number[];
    color?: string;
  }[];
  labels: string[];
  title: string;
  subtitle?: string;
  height?: number;
}

/**
 * MultiLineChart 组件 - 多折线图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和点位 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 */
function MultiLineChartComponent({ data: series, labels, title, subtitle, height = DEFAULT_MULTI_HEIGHT }: MultiLineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ seriesIndex: number; pointIndex: number } | null>(null);

  // 性能优化: useMemo 缓存统计值计算
  const { minValue, maxValue } = useMemo(() => {
    const allValues = series.flatMap((s) => s.values);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return { minValue: Math.min(0, min), maxValue: max || 1 };
  }, [series]);

  // 性能优化: useMemo 缓存图表配置
  const chartConfig = useMemo(() => ({
    width: 500,
    height,
    padding: CHART_PADDING,
    chartWidth: 500 - CHART_PADDING.left - CHART_PADDING.right,
    chartHeight: height - CHART_PADDING.top - CHART_PADDING.bottom,
  }), [height]);

  // 性能优化: useMemo 缓存所有点位计算
  const allPoints = useMemo(() => {
    const { padding, chartWidth, chartHeight } = chartConfig;
    return series.map((s) => ({
      name: s.name,
      color: s.color || CHART_COLORS.blue,
      points: s.values.map((v, i) => ({
        x: padding.left + (chartWidth / (labels.length - 1 || 1)) * i,
        y: padding.top + chartHeight - ((v - minValue) / (maxValue - minValue || 1)) * chartHeight,
        value: v,
      })),
    }));
  }, [series, labels, chartConfig, minValue, maxValue]);

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((seriesIndex: number, pointIndex: number) => {
    setHoveredPoint({ seriesIndex, pointIndex });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  // 性能优化: useMemo 缓存图例项
  const legendItems = useMemo(() => 
    series.map((s) => ({ label: s.name, color: s.color || CHART_COLORS.blue })),
    [series]
  );

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
        className="overflow-visible"
      >
        {/* Grid */}
        {Array.from({ length: GRID_LINES_COUNT }).map((_, i) => (
          <line
            key={i}
            x1={chartConfig.padding.left}
            y1={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            x2={chartConfig.width - chartConfig.padding.right}
            y2={chartConfig.padding.top + (chartConfig.chartHeight / (GRID_LINES_COUNT - 1)) * i}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeDasharray="4,4"
          />
        ))}

        {/* Lines */}
        {allPoints.map((s, si) => {
          const pathD = s.points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
          return (
            <g key={si}>
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.points.map((p, pi) => (
                <circle
                  key={pi}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint?.seriesIndex === si && hoveredPoint?.pointIndex === pi ? 5 : 3}
                  fill={s.color}
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => handleMouseEnter(si, pi)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => {
          const showLabel = labels.length <= 10 || i % Math.ceil(labels.length / 10) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={i}
              x={chartConfig.padding.left + (chartConfig.chartWidth / (labels.length - 1 || 1)) * i}
              y={chartConfig.height - chartConfig.padding.bottom + 20}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400 text-xs"
            >
              {label.length > 8 ? label.slice(0, 8) : label}
            </text>
          );
        })}
      </svg>

      <ChartLegend items={legendItems} position="bottom" />
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const MultiLineChart = memo(MultiLineChartComponent);