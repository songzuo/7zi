'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChartContainer, ChartLegend, CHART_COLORS, CHART_PALETTE } from './Chart';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_SIZE = 400;
const DEFAULT_RADIUS = 150;

// ===== Radar Chart =====
interface RadarChartProps {
  data: {
    label: string;
    values: { metric: string; value: number }[];
    color?: string;
  }[];
  title: string;
  subtitle?: string;
  size?: number;
  maxValue?: number;
  showLabels?: boolean;
  animate?: boolean;
}

/**
 * RadarChart 组件 - 雷达图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存数值计算和路径 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 */
function RadarChartComponent({
  data,
  title,
  subtitle,
  size = DEFAULT_SIZE,
  maxValue: propMaxValue,
  showLabels = true,
  animate = true,
}: RadarChartProps) {
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(null);

  // 性能优化: useMemo 缓存指标列表
  const metrics = useMemo(() => {
    if (data.length === 0 || data[0].values.length === 0) return [];
    return data[0].values.map(v => v.metric);
  }, [data]);

  // 性能优化: useMemo 缓存最大值
  const maxValue = useMemo(() => {
    if (propMaxValue) return propMaxValue;
    const allValues = data.flatMap(d => d.values.map(v => v.value));
    return Math.max(...allValues, 1);
  }, [data, propMaxValue]);

  // 性能优化: useMemo 缓存中心点和半径
  const center = useMemo(() => ({
    x: size / 2,
    y: size / 2,
  }), [size]);

  const radius = useMemo(() => Math.min(size / 2 - 50, DEFAULT_RADIUS), [size]);

  // 性能优化: useMemo 缓存角度间隔
  const angleStep = useMemo(() => (2 * Math.PI) / metrics.length, [metrics.length]);

  // 性能优化: useMemo 缓存网格线数据
  const gridLines = useMemo(() => {
    const levels = 5;
    const lines = [];
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      const points = metrics.map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return {
          x: center.x + levelRadius * Math.cos(angle),
          y: center.y + levelRadius * Math.sin(angle),
        };
      });
      lines.push({ levelRadius, points });
    }
    return lines;
  }, [metrics, angleStep, center, radius]);

  // 性能优化: useMemo 缓存轴线数据
  const axisLines = useMemo(() => {
    return metrics.map((_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return {
        x1: center.x,
        y1: center.y,
        x2: center.x + radius * Math.cos(angle),
        y2: center.y + radius * Math.sin(angle),
      };
    });
  }, [metrics, angleStep, center, radius]);

  // 性能优化: useMemo 缓存标签位置
  const labelPositions = useMemo(() => {
    return metrics.map((metric, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: center.x + labelRadius * Math.cos(angle),
        y: center.y + labelRadius * Math.sin(angle),
        metric,
        textAnchor: angle > Math.PI / 2 || angle < -Math.PI / 2 ? 'end' : 
                    Math.abs(angle) === Math.PI / 2 ? 'middle' : 'start',
      };
    });
  }, [metrics, angleStep, center, radius]);

  // 性能优化: useMemo 缓存数据多边形路径
  const dataPolygons = useMemo(() => {
    return data.map((series, seriesIndex) => {
      const points = series.values.map((v, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (v.value / maxValue) * radius;
        return {
          x: center.x + r * Math.cos(angle),
          y: center.y + r * Math.sin(angle),
        };
      });

      const pathD = points.reduce((acc, p, i) => {
        return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
      }, '') + ' Z';

      return {
        pathD,
        color: series.color || CHART_PALETTE[seriesIndex % CHART_PALETTE.length],
        name: series.label,
        points,
      };
    });
  }, [data, angleStep, center, radius, maxValue]);

  // 性能优化: useCallback 缓存 hover 事件
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredSeries(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);

  // 性能优化: useMemo 缓存图例项
  const legendItems = useMemo(() => 
    data.map((d, i) => ({ 
      label: d.label, 
      color: d.color || CHART_PALETTE[i % CHART_PALETTE.length],
    })),
    [data]
  );

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid polygons */}
        {gridLines.map((grid, i) => (
          <polygon
            key={i}
            points={grid.points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={1}
            strokeDasharray={i === gridLines.length - 1 ? 'none' : '2,2'}
          />
        ))}

        {/* Axis lines */}
        {axisLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="currentColor"
            className="text-gray-300 dark:text-gray-600"
            strokeWidth={1}
          />
        ))}

        {/* Labels */}
        {showLabels && labelPositions.map((pos, i) => (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.textAnchor}
            alignmentBaseline="middle"
            className="fill-gray-600 dark:text-gray-400 text-xs"
          >
            {pos.metric}
          </text>
        ))}

        {/* Data polygons */}
        {dataPolygons.map((polygon, i) => (
          <g key={i}>
            <polygon
              points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={polygon.color}
              fillOpacity={hoveredSeries === null || hoveredSeries === i ? 0.3 : 0.1}
              stroke={polygon.color}
              strokeWidth={2}
              className={`transition-all duration-200 cursor-pointer ${animate ? 'animate-scale-in' : ''}`}
              onMouseEnter={() => handleMouseEnter(i)}
              onMouseLeave={handleMouseLeave}
            />
            {/* Data points */}
            {polygon.points.map((p, pi) => (
              <circle
                key={pi}
                cx={p.x}
                cy={p.y}
                r={4}
                fill={polygon.color}
                stroke="white"
                strokeWidth={2}
                className="pointer-events-none"
              />
            ))}
          </g>
        ))}

        {/* Center point */}
        <circle
          cx={center.x}
          cy={center.y}
          r={3}
          fill="currentColor"
          className="text-gray-400 dark:text-gray-600"
        />
      </svg>

      {data.length > 1 && (
        <ChartLegend items={legendItems} position="bottom" />
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
          transform-origin: center;
        }
      `}</style>
    </ChartContainer>
  );
}

export const RadarChart = memo(RadarChartComponent);

// ===== Spider Chart (Alias for Radar) =====
export const SpiderChart = RadarChart;