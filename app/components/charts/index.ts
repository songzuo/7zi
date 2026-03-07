'use client';

import { BarChart, GroupedBarChart } from './BarChart';
import { LineChart, RealtimeLineChart, MultiLineChart } from './LineChart';
import { PieChart, DonutChart, GaugeChart } from './PieChart';
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  GridLines,
  AxisLabels,
  CHART_COLORS,
  CHART_PALETTE,
  type ChartDataPoint,
  type TimeSeriesPoint,
  type ChartDimensions,
} from './Chart';

// Re-export everything
export {
  // Bar charts
  BarChart,
  GroupedBarChart,
  // Line charts
  LineChart,
  RealtimeLineChart,
  MultiLineChart,
  // Pie/Donut/Gauge
  PieChart,
  DonutChart,
  GaugeChart,
  // Base components
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  GridLines,
  AxisLabels,
  // Colors
  CHART_COLORS,
  CHART_PALETTE,
};

// Types
export type { ChartDataPoint, TimeSeriesPoint, ChartDimensions };