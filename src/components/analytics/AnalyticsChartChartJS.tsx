/**
 * AnalyticsChartChartJS - 使用 Chart.js 的数据分析图表组件
 * 提供 Recharts 的替代方案
 */

'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar } from 'react-chartjs-2';
import { type ChartConfig, type TimeSeriesDataPoint, type ChartType } from '@/lib/types/analytics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnalyticsChartChartJSProps {
  config: ChartConfig;
  onExport?: (format: 'csv' | 'xlsx' | 'json') => void;
  locale?: string;
  className?: string;
}

// ============================================================================
// Color Palette
// ============================================================================

const COLORS = {
  blue: 'rgba(59, 130, 246, 1)',
  blueTransparent: 'rgba(59, 130, 246, 0.3)',
  green: 'rgba(16, 185, 129, 1)',
  greenTransparent: 'rgba(16, 185, 129, 0.3)',
  purple: 'rgba(139, 92, 246, 1)',
  purpleTransparent: 'rgba(139, 92, 246, 0.3)',
  orange: 'rgba(245, 158, 11, 1)',
  orangeTransparent: 'rgba(245, 158, 11, 0.3)',
  red: 'rgba(239, 68, 68, 1)',
  redTransparent: 'rgba(239, 68, 68, 0.3)',
  cyan: 'rgba(6, 182, 212, 1)',
  cyanTransparent: 'rgba(6, 182, 212, 0.3)',
  pink: 'rgba(236, 72, 153, 1)',
  pinkTransparent: 'rgba(236, 72, 153, 0.3)'
};

const CHART_COLORS = [
  COLORS.blue,
  COLORS.green,
  COLORS.purple,
  COLORS.orange,
  COLORS.red,
  COLORS.cyan,
  COLORS.pink
];

// ============================================================================
// Chart Options Generator
// ============================================================================

interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
      labels: {
        color: string;
        font: { size: number };
      };
    };
    tooltip: {
      enabled: boolean;
      mode: 'index' | 'point' | 'dataset' | 'nearest';
      intersect: boolean;
      backgroundColor: string;
      titleColor: string;
      bodyColor: string;
      borderColor: string;
      borderWidth: number;
      callbacks: {
        label: (context: unknown) => string;
      };
    };
  };
  scales?: {
    x?: {
      display: boolean;
      grid: { display: boolean; color: string };
      ticks: { color: string; font: { size: number } };
    };
    y?: {
      display: boolean;
      grid: { display: boolean; color: string };
      ticks: {
        color: string;
        font: { size: number };
        callback: (value: unknown) => string;
      };
    };
  };
  elements: {
    line: { tension: number };
    point: { radius: number; hoverRadius: number };
    bar: { borderRadius: number };
  };
  interaction: {
    mode: 'index' | 'point' | 'dataset' | 'nearest';
    intersect: boolean;
  };
}

const generateChartOptions = (
  isDarkMode: boolean,
  showLegend: boolean,
  showTooltip: boolean,
  locale: string
): ChartOptions => {
  const textColor = isDarkMode ? '#d4d4d8' : '#374151';
  const gridColor = isDarkMode ? '#27272a' : '#e5e7eb';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          color: textColor,
          font: { size: 12 }
        }
      },
      tooltip: {
        enabled: showTooltip,
        mode: 'index',
        intersect: false,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        callbacks: {
          label: (context: unknown) => {
            const ctx = context as { dataset?: { label?: string }; parsed?: { y?: number | null } };
            let label = ctx.dataset?.label || '';
            if (label) {
              label += ': ';
            }
            if (ctx.parsed?.y !== null && ctx.parsed?.y !== undefined) {
              label += ctx.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
          color: gridColor
        },
        ticks: {
          color: textColor,
          font: { size: 11 }
        }
      },
      y: {
        display: true,
        grid: {
          display: true,
          color: gridColor
        },
        ticks: {
          color: textColor,
          font: { size: 11 },
          callback: (value: unknown) => {
            const numValue = value as number;
            if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + 'M';
            if (numValue >= 1000) return (numValue / 1000).toFixed(1) + 'k';
            return String(numValue);
          }
        }
      }
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 3, hoverRadius: 5 },
      bar: { borderRadius: 4 }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };
};

// ============================================================================
// Data Preparation Functions
// ============================================================================

const prepareLineAreaData = (
  data: TimeSeriesDataPoint[],
  metrics: string[],
  chartType: 'line' | 'area',
  isDarkMode: boolean,
  locale: string = 'en'
) => {
  const labels = data.map(item =>
    item.date || new Date(item.timestamp).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  );

  const datasets = metrics.map((metric, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    const isBlue = color === COLORS.blue;
    const isGreen = color === COLORS.green;
    const isPurple = color === COLORS.purple;

    let backgroundColor, borderColor;

    if (chartType === 'area') {
      backgroundColor = isBlue
        ? COLORS.blueTransparent
        : isGreen
        ? COLORS.greenTransparent
        : isPurple
        ? COLORS.purpleTransparent
        : COLORS.orangeTransparent;
      borderColor = color;
    } else {
      backgroundColor = 'transparent';
      borderColor = color;
    }

    return {
      label: metric,
      data: data.map(item => Number(item[metric]) || 0),
      backgroundColor,
      borderColor,
      borderWidth: 2,
      fill: chartType === 'area',
      tension: 0.4
    };
  });

  return { labels, datasets };
};

const prepareBarData = (
  data: TimeSeriesDataPoint[],
  metrics: string[],
  isDarkMode: boolean,
  locale: string = 'en'
) => {
  const labels = data.map(item =>
    item.date || new Date(item.timestamp).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  );

  const datasets = metrics.map((metric, index) => ({
    label: metric,
    data: data.map(item => Number(item[metric]) || 0),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    borderWidth: 1,
    borderRadius: 4
  }));

  return { labels, datasets };
};

const preparePieDonutData = (
  data: TimeSeriesDataPoint[],
  metrics: string[],
  chartType: 'pie' | 'donut'
) => {
  const aggregatedData = metrics.map((metric, index) => ({
    label: metric,
    value: data.reduce((sum, item) => sum + (Number(item[metric]) || 0), 0),
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  return {
    labels: aggregatedData.map(d => d.label),
    datasets: [
      {
        data: aggregatedData.map(d => d.value),
        backgroundColor: aggregatedData.map(d => d.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        cutout: chartType === 'donut' ? '60%' : '0%'
      }
    ]
  };
};

const prepareRadarData = (
  data: TimeSeriesDataPoint[],
  metrics: string[],
  isDarkMode: boolean,
  locale: string = 'en'
) => {
  // Use first 7 data points to avoid overcrowding
  const limitedData = data.slice(0, 7);
  const labels = limitedData.map(item =>
    item.date || new Date(item.timestamp).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    })
  );

  const datasets = metrics.slice(0, 5).map((metric, index) => ({
    label: metric,
    data: limitedData.map(item => Number(item[metric]) || 0),
    backgroundColor: CHART_COLORS[index % CHART_COLORS.length] + '33',
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    borderWidth: 2,
    pointBackgroundColor: CHART_COLORS[index % CHART_COLORS.length],
    pointBorderColor: '#ffffff',
    pointHoverBackgroundColor: '#ffffff',
    pointHoverBorderColor: CHART_COLORS[index % CHART_COLORS.length]
  }));

  return { labels, datasets };
};

// ============================================================================
// Main Component
// ============================================================================

export const AnalyticsChartChartJS: React.FC<AnalyticsChartChartJSProps> = ({
  config,
  onExport,
  locale = 'en',
  className = ''
}) => {
  const chartRef = useRef<ChartJS<'line' | 'bar' | 'pie' | 'doughnut' | 'radar'> | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Detect dark mode
  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const { type, title, data, metrics, colors, showLegend = true, showTooltip = true, height = 300 } = config;

  const chartOptions = useMemo(
    () => generateChartOptions(isDarkMode, showLegend, showTooltip, locale),
    [isDarkMode, showLegend, showTooltip, locale]
  );

  const chartData = useMemo(() => {
    switch (type) {
      case 'line':
      case 'area':
        return prepareLineAreaData(data, metrics, type, isDarkMode, locale);

      case 'bar':
        return prepareBarData(data, metrics, isDarkMode, locale);

      case 'pie':
      case 'donut':
        return preparePieDonutData(data, metrics, type);

      case 'radar':
        return prepareRadarData(data, metrics, isDarkMode, locale);

      default:
        return { labels: [], datasets: [] };
    }
  }, [data, metrics, type, isDarkMode]);

  const renderChart = () => {
    switch (type) {
      case 'line':
      case 'area':
        return (
          <Line
            ref={chartRef as React.RefObject<ChartJS<'line'>>}
            data={chartData}
            options={chartOptions as ChartJS<'line'>['options']}
          />
        );

      case 'bar':
        return (
          <Bar
            ref={chartRef as React.RefObject<ChartJS<'bar'>>}
            data={chartData}
            options={chartOptions as ChartJS<'bar'>['options']}
          />
        );

      case 'pie':
        return (
          <Pie
            ref={chartRef as React.RefObject<ChartJS<'pie'>>}
            data={chartData}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins.legend,
                  position: 'right'
                }
              },
              scales: undefined
            }}
          />
        );

      case 'donut':
        return (
          <Doughnut
            ref={chartRef as React.RefObject<ChartJS<'doughnut'>>}
            data={chartData}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                legend: {
                  ...chartOptions.plugins.legend,
                  position: 'right'
                }
              },
              scales: undefined
            }}
          />
        );

      case 'radar':
        return (
          <Radar
            ref={chartRef as React.RefObject<ChartJS<'radar'>>}
            data={chartData}
            options={{
              ...chartOptions,
              scales: {
                r: {
                  display: true,
                  grid: {
                    display: true,
                    color: isDarkMode ? '#27272a' : '#e5e7eb'
                  },
                  ticks: {
                    color: isDarkMode ? '#d4d4d8' : '#374151',
                    backdropColor: 'transparent'
                  },
                  pointLabels: {
                    color: isDarkMode ? '#d4d4d8' : '#374151',
                    font: { size: 11 }
                  }
                }
              }
            }}
          />
        );

      default:
        return <div className="flex items-center justify-center h-full text-gray-500">Unsupported chart type</div>;
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Button */}
          {onExport && (
            <div className="relative group">
              <button
                className="p-2 bg-gray-100 dark:bg-zinc-700 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                data-testid="export-button"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                {['csv', 'xlsx', 'json'].map((format) => (
                  <button
                    key={format}
                    onClick={() => onExport(format as 'csv' | 'xlsx' | 'json')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default AnalyticsChartChartJS;
