'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChartContainer, ChartLegend, CHART_COLORS } from './Chart';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_HEIGHT = 300;
const DEFAULT_STACKED_HEIGHT = 350;
const GRID_LINES_COUNT = 5;
const CHART_PADDING = { top: 30, right: 30, bottom: 60, left: 60 };

// ===== Area Chart =====
interface AreaChartProps {
  data: { label: string; value: number }[];
  title: string;
  subtitle?: string;
  height?: number;
  color?: string;
  showGradient?: boolean;
  animate?: boolean;
}

/**
 * AreaChart 组件 - 面积图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和路径 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 */
function AreaChartComponent({
  data,
  title,
  subtitle,
  height = DEFAULT_HEIGHT,
  color = CHART_COLORS.blue,
  showGradient = true,
  animate = true,
}: AreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 性能优化: useMemo 缓存统计值计算
  const { minValue, maxValue, total, avgValue } = useMemo(() => {
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    return { 
      minValue: Math.min(0, min), 
      maxValue: max || 1, 
      total: sum,
      avgValue: sum / values.length || 0 
    };
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

  // 性能优化: useMemo 缓存平滑曲线路径
  const smoothPathD = useMemo(() => {
    if (points.length === 0) return '';
    
    // 使用贝塞尔曲线创建平滑路径
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      d += ` Q ${points[i - 1].x} ${points[i - 1].y} ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  }, [points]);

  // 性能优化: useMemo 缓存面积路径
  const areaPathD = useMemo(() => {
    if (points.length === 0) return '';
    const { padding, chartHeight } = chartConfig;
    const yBase = padding.top + chartHeight;
    return `${smoothPathD} L ${points[points.length - 1].x} ${yBase} L ${points[0].x} ${yBase} Z`;
  }, [smoothPathD, points, chartConfig]);

  // 性能优化: useMemo 缓存渐变 ID
  const gradientId = useMemo(() => `area-gradient-${title.replace(/\s+/g, '-')}`, [title]);

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // 性能优化: useMemo 缓存 Y 轴标签
  const yLabels = useMemo(() => [
    maxValue,
    Math.round(((maxValue - minValue) * 0.75 + minValue)),
    Math.round(((maxValue - minValue) * 0.5 + minValue)),
    Math.round(((maxValue - minValue) * 0.25 + minValue)),
    minValue
  ], [maxValue, minValue]);

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
        className="overflow-visible"
      >
        {/* Defs for gradients */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="50%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>

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
        <path
          d={areaPathD}
          fill={showGradient ? `url(#${gradientId})` : color}
          fillOpacity={showGradient ? 1 : 0.3}
          className={animate ? 'animate-fade-in' : ''}
        />

        {/* Line */}
        <path
          d={smoothPathD}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate ? 'animate-draw-line' : ''}
        />

        {/* Points */}
        {points.map((point, i) => (
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
                  x={point.x - 35}
                  y={point.y - 40}
                  width={70}
                  height={30}
                  fill="currentColor"
                  className="text-gray-900 dark:text-gray-700"
                  rx={4}
                />
                <text
                  x={point.x}
                  y={point.y - 20}
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
              className="fill-gray-500 dark:fill-gray-400 text-xs"
            >
              {d.label.length > 8 ? d.label.slice(0, 8) : d.label}
            </text>
          );
        })}
      </svg>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">最小值</div>
          <div className="font-semibold text-gray-900 dark:text-white">{minValue}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">最大值</div>
          <div className="font-semibold text-gray-900 dark:text-white">{maxValue}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">平均值</div>
          <div className="font-semibold text-gray-900 dark:text-white">{avgValue.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">总计</div>
          <div className="font-semibold text-gray-900 dark:text-white">{total}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes draw-line {
          from { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
          to { stroke-dasharray: 1000; stroke-dashoffset: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
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

export const AreaChart = memo(AreaChartComponent);

// ===== Stacked Area Chart =====
interface StackedAreaChartProps {
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

function StackedAreaChartComponent({ 
  data: series, 
  labels, 
  title, 
  subtitle, 
  height = DEFAULT_STACKED_HEIGHT 
}: StackedAreaChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  // 性能优化: useMemo 缓存累积值计算
  const stackedData = useMemo(() => {
    const result: { name: string; color: string; stackedValues: number[][] }[] = [];
    
    for (let s = 0; s < series.length; s++) {
      const stackedValues: number[][] = [];
      for (let i = 0; i < series[s].values.length; i++) {
        const previousSum = s === 0 ? 0 : result[s - 1].stackedValues[i][1];
        const currentValue = series[s].values[i];
        stackedValues.push([previousSum, previousSum + currentValue]);
      }
      result.push({
        name: series[s].name,
        color: series[s].color || CHART_COLORS.blue,
        stackedValues,
      });
    }
    return result;
  }, [series]);

  // 性能优化: useMemo 缓存最大值
  const maxValue = useMemo(() => {
    const lastSeries = stackedData[stackedData.length - 1];
    if (!lastSeries) return 1;
    return Math.max(...lastSeries.stackedValues.map(v => v[1])) || 1;
  }, [stackedData]);

  // 性能优化: useMemo 缓存图表配置
  const chartConfig = useMemo(() => ({
    width: 500,
    height,
    padding: CHART_PADDING,
    chartWidth: 500 - CHART_PADDING.left - CHART_PADDING.right,
    chartHeight: height - CHART_PADDING.top - CHART_PADDING.bottom,
  }), [height]);

  // 性能优化: useMemo 缓存所有面积路径
  const areaPaths = useMemo(() => {
    const { padding, chartWidth, chartHeight } = chartConfig;
    const yBase = padding.top + chartHeight;
    
    return stackedData.map((s) => {
      const topPoints = s.stackedValues.map((v, i) => ({
        x: padding.left + (chartWidth / (labels.length - 1 || 1)) * i,
        yTop: padding.top + chartHeight - (v[1] / maxValue) * chartHeight,
        yBottom: padding.top + chartHeight - (v[0] / maxValue) * chartHeight,
      }));

      // 创建顶部路径
      let topPath = `M ${topPoints[0].x} ${topPoints[0].yTop}`;
      for (let i = 1; i < topPoints.length; i++) {
        const xc = (topPoints[i].x + topPoints[i - 1].x) / 2;
        const yc = (topPoints[i].yTop + topPoints[i - 1].yTop) / 2;
        topPath += ` Q ${topPoints[i - 1].x} ${topPoints[i - 1].yTop} ${xc} ${yc}`;
      }
      topPath += ` L ${topPoints[topPoints.length - 1].x} ${topPoints[topPoints.length - 1].yTop}`;

      // 创建底部路径 (反向)
      let bottomPath = '';
      for (let i = topPoints.length - 1; i >= 0; i--) {
        bottomPath += ` L ${topPoints[i].x} ${topPoints[i].yBottom}`;
      }

      return {
        d: `${topPath}${bottomPath} Z`,
        color: s.color,
        name: s.name,
      };
    });
  }, [stackedData, chartConfig, labels.length, maxValue]);

  // 性能优化: useMemo 缓存图例项
  const legendItems = useMemo(() => 
    series.map((s, i) => ({ 
      label: s.name, 
      color: s.color || CHART_COLORS.blue,
    })),
    [series]
  );

  // 性能优化: useMemo 缓存 Y 轴标签
  const yLabels = useMemo(() => [
    maxValue,
    Math.round(maxValue * 0.75),
    Math.round(maxValue * 0.5),
    Math.round(maxValue * 0.25),
    0
  ], [maxValue]);

  // 性能优化: useCallback 缓存 hover 事件
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredSeries(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);

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

        {/* Areas */}
        {areaPaths.map((area, i) => (
          <path
            key={i}
            d={area.d}
            fill={area.color}
            fillOpacity={hoveredSeries === null || hoveredSeries === i ? 0.7 : 0.3}
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
          />
        ))}

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

export const StackedAreaChart = memo(StackedAreaChartComponent);