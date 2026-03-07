'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { ChartDataPoint, ChartContainer, ChartLegend } from './Chart';

// ===== 性能优化: 常量配置移到组件外部 =====
const DEFAULT_SIZE = 200;
const DEFAULT_DONUT_WIDTH = 30;
const PIE_ANIMATION_DELAY_BASE = 0.05;

// ===== Pie Chart =====
interface PieChartProps {
  data: ChartDataPoint[];
  title: string;
  subtitle?: string;
  size?: number;
  donut?: boolean;
  donutWidth?: number;
  showLabels?: boolean;
  showPercentage?: boolean;
  animate?: boolean;
}

/**
 * PieChart 组件 - 饼图/环形图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存 total 和 segments 计算 - 避免重复计算
 * 3. useCallback 缓存 hover 事件处理 - 避免函数重建
 * 4. 常量配置外部化 - 减少每次渲染的对象创建
 */
function PieChartComponent({
  data,
  title,
  subtitle,
  size = DEFAULT_SIZE,
  donut = false,
  donutWidth = DEFAULT_DONUT_WIDTH,
  showLabels = true,
  showPercentage = true,
  animate = true,
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 性能优化: useMemo 缓存 total 计算，仅在 data 变化时重新计算
  const total = useMemo(() => {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((sum, d) => sum + (d?.value ?? 0), 0);
  }, [data]);

  // 性能优化: useMemo 缓存 segments 计算，避免每次渲染重新计算路径
  const { segments, center } = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return {
        segments: [],
        center: { x: size / 2, y: size / 2 }
      };
    }

    const cx = size / 2;
    const cy = size / 2;
    const radius = donut ? (size / 2) - (donutWidth / 2) : (size / 2) - 10;
    const innerRadius = donut ? radius - donutWidth : 0;

    let currentAngle = -90; // Start from top

    const segs = data.map((item, index) => {
      const itemValue = item?.value ?? 0;
      const percentage = total > 0 ? (itemValue / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      let path: string;
      if (donut) {
        const ix1 = cx + innerRadius * Math.cos(startRad);
        const iy1 = cy + innerRadius * Math.sin(startRad);
        const ix2 = cx + innerRadius * Math.cos(endRad);
        const iy2 = cy + innerRadius * Math.sin(endRad);

        path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
      } else {
        path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      }

      // Label position (middle of arc)
      const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
      const labelRadius = donut ? radius - donutWidth / 2 : radius * 0.65;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      return {
        path,
        color: item?.color || `hsl(${(index * 45) % 360}, 70%, 60%)`,
        percentage,
        value: itemValue,
        label: item?.label,
        labelX,
        labelY,
        startAngle,
        endAngle,
      };
    });

    return { segments: segs, center: { x: cx, y: cy } };
  }, [data, size, donut, donutWidth, total]);

  // 性能优化: useCallback 缓存 hover 事件处理函数
  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <div className="flex items-center justify-center gap-8">
        <svg width={size} height={size} className="overflow-visible">
          {/* Segments */}
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.path}
                fill={segment.color}
                className={`transition-all duration-200 cursor-pointer ${
                  hoveredIndex === index ? 'brightness-110 scale-105' : 'opacity-90'
                } ${animate ? 'animate-pie-grow' : ''}`}
                style={{
                  transformOrigin: `${center.x}px ${center.y}px`,
                  transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              />
              {/* Label */}
              {showLabels && segment.percentage > 5 && (
                <text
                  x={segment.labelX}
                  y={segment.labelY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="fill-white text-xs font-semibold pointer-events-none"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {showPercentage ? `${segment.percentage.toFixed(0)}%` : segment.value}
                </text>
              )}
            </g>
          ))}

          {/* Center text for donut */}
          {donut && (
            <text
              x={center.x}
              y={center.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              className="fill-gray-900 dark:fill-white"
            >
              <tspan className="text-2xl font-bold">{total}</tspan>
              <tspan x={center.x} dy="1.2em" className="text-xs fill-gray-500">
                总计
              </tspan>
            </text>
          )}
        </svg>

        {/* Legend on the side */}
        <div className="space-y-2">
          {data.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                hoveredIndex !== null && hoveredIndex !== index ? 'opacity-50' : 'opacity-100'
              }`}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: segments[index]?.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[80px]">{item.label}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.value}
              </span>
              <span className="text-xs text-gray-500">
                ({((item.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pie-grow {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 0.9;
          }
        }
        .animate-pie-grow {
          animation: pie-grow 0.5s ease-out forwards;
          animation-delay: ${PIE_ANIMATION_DELAY_BASE}s;
          transform-origin: center;
        }
      `}</style>
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件，避免不必要的重渲染
export const PieChart = memo(PieChartComponent);

// ===== Donut Chart (alias) =====
export const DonutChart = memo((props: Omit<PieChartProps, 'donut'>) => (
  <PieChart {...props} donut />
));

// ===== Gauge Chart =====
interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  subtitle?: string;
  size?: number;
  color?: string;
  thresholds?: { value: number; color: string }[];
  showValue?: boolean;
  unit?: string;
}

/**
 * GaugeChart 组件 - 仪表盘图
 * 
 * 性能优化策略:
 * 1. React.memo 包装 - 避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存颜色和路径计算 - 避免重复计算
 */
function GaugeChartComponent({
  value,
  max,
  title,
  subtitle,
  size = DEFAULT_SIZE,
  color = '#3b82f6',
  thresholds,
  showValue = true,
  unit = '%',
}: GaugeChartProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // 性能优化: useMemo 缓存颜色计算
  const activeColor = useMemo(() => {
    if (!thresholds) return color;
    const sortedThresholds = [...thresholds].sort((a, b) => b.value - a.value);
    for (const t of sortedThresholds) {
      if (percentage >= t.value) return t.color;
    }
    return color;
  }, [thresholds, percentage, color]);

  // 性能优化: useMemo 缓存路径计算
  const { arcPath, needleRotation } = useMemo(() => {
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 15;
    const startAngle = -135;
    const endAngle = 135;

    // Background arc (full)
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const bgX1 = cx + radius * Math.cos(startRad);
    const bgY1 = cy + radius * Math.sin(startRad);
    const bgX2 = cx + radius * Math.cos(endRad);
    const bgY2 = cy + radius * Math.sin(endRad);

    // Value arc (partial)
    const valueAngle = startAngle + (percentage / 100) * (endAngle - startAngle);
    const valueRad = (valueAngle * Math.PI) / 180;
    const valueX = cx + radius * Math.cos(valueRad);
    const valueY = cy + radius * Math.sin(valueRad);

    const largeArc = percentage > 50 ? 1 : 0;

    const path = `M ${bgX1} ${bgY1} A ${radius} ${radius} 0 ${largeArc} 1 ${valueX} ${valueY}`;

    // Needle rotation
    const needleAngle = startAngle + (percentage / 100) * (endAngle - startAngle);

    return { arcPath: path, needleRotation: needleAngle };
  }, [size, percentage]);

  return (
    <ChartContainer title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center">
        <svg width={size} height={size * 0.7} className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${size / 2 - ((size / 2) - 15) * Math.cos((135 * Math.PI) / 180)} ${size / 2 + ((size / 2) - 15) * Math.sin((135 * Math.PI) / 180)} A ${(size / 2) - 15} ${(size / 2) - 15} 0 1 1 ${size / 2 - ((size / 2) - 15) * Math.cos((135 * Math.PI) / 180)} ${size / 2 + ((size / 2) - 15) * Math.sin((135 * Math.PI) / 180)}`}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={20}
            strokeLinecap="round"
          />

          {/* Value arc */}
          <path
            d={arcPath}
            fill="none"
            stroke={activeColor}
            strokeWidth={20}
            strokeLinecap="round"
            className="transition-all duration-500"
          />

          {/* Needle */}
          <g transform={`rotate(${needleRotation}, ${size / 2}, ${size / 2})`}>
            <line
              x1={size / 2}
              y1={size / 2}
              x2={size / 2}
              y2={size / 2 - ((size / 2) - 35)}
              stroke={activeColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={size / 2} cy={size / 2} r={8} fill={activeColor} />
          </g>

          {/* Center value */}
          {showValue && (
            <text
              x={size / 2}
              y={size * 0.6}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              <tspan className="fill-gray-900 dark:fill-white text-2xl font-bold">
                {value.toFixed(0)}
              </tspan>
              <tspan className="fill-gray-500 text-sm">{unit}</tspan>
            </text>
          )}
        </svg>

        {/* Thresholds legend */}
        {thresholds && (
          <div className="flex gap-4 mt-2">
            {thresholds.map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="text-xs text-gray-500">&gt;{t.value}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartContainer>
  );
}

// 性能优化: 使用 React.memo 包装组件
export const GaugeChart = memo(GaugeChartComponent);
