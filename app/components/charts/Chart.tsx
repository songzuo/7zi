'use client';

import { ReactNode, SVGProps } from 'react';

// ===== Types =====
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

// ===== Base Chart Container =====
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartContainer({ title, subtitle, children, className = '', actions }: ChartContainerProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ===== Tooltip =====
interface TooltipProps {
  x: number;
  y: number;
  visible: boolean;
  content: ReactNode;
}

export function ChartTooltip({ x, y, visible, content }: TooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute z-50 bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
      style={{ left: x, top: y - 10 }}
    >
      {content}
      <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
    </div>
  );
}

// ===== Legend =====
interface LegendItem {
  label: string;
  color: string;
  value?: number | string;
}

interface LegendProps {
  items: LegendItem[];
  position?: 'top' | 'bottom' | 'right';
}

export function ChartLegend({ items, position = 'bottom' }: LegendProps) {
  const positionClasses = {
    top: 'flex flex-wrap gap-4 mb-4',
    bottom: 'flex flex-wrap gap-4 mt-4',
    right: 'flex flex-col gap-2 ml-4',
  };

  return (
    <div className={positionClasses[position]}>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== Grid Lines =====
interface GridLinesProps extends SVGProps<SVGGElement> {
  width: number;
  height: number;
  padding: ChartDimensions['padding'];
  horizontalLines?: number;
  verticalLines?: number;
}

export function GridLines({
  width,
  height,
  padding,
  horizontalLines = 5,
  verticalLines = 5,
  ...props
}: GridLinesProps) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const horizontalPoints = Array.from({ length: horizontalLines + 1 }, (_, i) => ({
    y: padding.top + (chartHeight / horizontalLines) * i,
  }));

  const verticalPoints = Array.from({ length: verticalLines + 1 }, (_, i) => ({
    x: padding.left + (chartWidth / verticalLines) * i,
  }));

  return (
    <g {...props}>
      {/* Horizontal grid lines */}
      {horizontalPoints.map((point, i) => (
        <line
          key={`h-${i}`}
          x1={padding.left}
          y1={point.y}
          x2={width - padding.right}
          y2={point.y}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={1}
          strokeDasharray={i === 0 || i === horizontalLines ? 'none' : '4,4'}
        />
      ))}
      {/* Vertical grid lines */}
      {verticalPoints.map((point, i) => (
        <line
          key={`v-${i}`}
          x1={point.x}
          y1={padding.top}
          x2={point.x}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      ))}
    </g>
  );
}

// ===== Axis Labels =====
interface AxisLabelsProps {
  xLabels?: string[];
  yLabels?: number[];
  width: number;
  height: number;
  padding: ChartDimensions['padding'];
}

export function AxisLabels({ xLabels, yLabels, width, height, padding }: AxisLabelsProps) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <g>
      {/* Y-axis labels */}
      {yLabels?.map((label, i) => (
        <text
          key={`y-${i}`}
          x={padding.left - 10}
          y={padding.top + (chartHeight / (yLabels.length - 1)) * i}
          textAnchor="end"
          alignmentBaseline="middle"
          className="fill-gray-500 dark:fill-gray-400 text-xs"
        >
          {label}
        </text>
      ))}
      {/* X-axis labels */}
      {xLabels?.map((label, i) => (
        <text
          key={`x-${i}`}
          x={padding.left + (chartWidth / (xLabels.length - 1)) * i}
          y={height - padding.bottom + 20}
          textAnchor="middle"
          className="fill-gray-500 dark:fill-gray-400 text-xs"
        >
          {label.length > 10 ? label.slice(0, 10) + '...' : label}
        </text>
      ))}
    </g>
  );
}

// ===== Default Colors =====
export const CHART_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
  yellow: '#eab308',
  pink: '#ec4899',
  cyan: '#06b6d4',
  indigo: '#6366f1',
  teal: '#14b8a6',
};

export const CHART_PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.purple,
  CHART_COLORS.orange,
  CHART_COLORS.cyan,
  CHART_COLORS.pink,
  CHART_COLORS.indigo,
  CHART_COLORS.teal,
];