/**
 * Shared chart configuration and utilities
 * Provides consistent styling, types, and helpers for all chart components
 */

import type {
  ChartOptions,
  ScaleOptions,
  FontSpec,
} from 'chart.js';

// Standard color palette for charts
export const CHART_COLORS = {
  // Status colors
  pending: '#f59e0b',      // amber-500
  assigned: '#3b82f6',     // blue-500
  in_progress: '#06b6d4', // cyan-500
  completed: '#10b981',    // emerald-500
  
  // Dataset colors
  primary: '#3b82f6',     // blue-500
  secondary: '#8b5cf6',   // purple-500
  success: '#10b981',     // emerald-500
  warning: '#f59e0b',     // amber-500
  info: '#06b6d4',        // cyan-500
  
  // Background colors (with opacity)
  primaryBg: 'rgba(59, 130, 246, 0.1)',
  secondaryBg: 'rgba(139, 92, 246, 0.1)',
  successBg: 'rgba(16, 185, 129, 0.1)',
  infoBg: 'rgba(6, 182, 212, 0.1)',
  
  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Grid colors
  gridLight: 'rgba(0, 0, 0, 0.05)',
  gridMedium: 'rgba(156, 163, 175, 0.1)',
} as const;

// Standard font settings
export const CHART_FONTS = {
  title: {
    size: 16,
    weight: 'bold' as const,
  },
  label: {
    size: 12,
    weight: 'normal' as const,
  },
  tick: {
    size: 11,
    weight: 'normal' as const,
  },
} as const;

// Base chart options factory
export function createBaseOptions(title?: string): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: CHART_COLORS.textSecondary,
          font: CHART_FONTS.label,
        },
      },
      title: title ? {
        display: true,
        text: title,
        color: CHART_COLORS.textPrimary,
        font: CHART_FONTS.title,
        padding: {
          top: 10,
          bottom: 20,
        },
      } : undefined,
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: CHART_COLORS.textPrimary,
        bodyColor: CHART_COLORS.textSecondary,
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
  };
}

// Standard scale options
export function createScaleOptions(): {
  x: ScaleOptions;
  y: ScaleOptions;
} {
  return {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: CHART_COLORS.textSecondary,
        font: CHART_FONTS.tick,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: CHART_COLORS.gridLight,
      },
      ticks: {
        color: CHART_COLORS.textSecondary,
        font: CHART_FONTS.tick,
        stepSize: 1,
      },
    },
  };
}

// Loading skeleton component
export function ChartLoadingSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div 
      className="flex items-center justify-center animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-lg"
      style={{ height: `${height}px` }}
    >
      <div className="text-zinc-400 dark:text-zinc-500">
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
          />
        </svg>
      </div>
    </div>
  );
}

// Empty state component
export function ChartEmptyState({ 
  message = '暂无数据',
  icon = '📊'
}: { 
  message?: string;
  icon?: string;
}) {
  return (
    <div className="flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
      <div className="text-center">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-zinc-500 dark:text-zinc-400">{message}</div>
      </div>
    </div>
  );
}

// Error state component
export function ChartErrorState({ 
  message = '图表加载失败',
  onRetry
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/10 rounded-lg">
      <div className="text-4xl mb-2">⚠️</div>
      <div className="text-red-600 dark:text-red-400 mb-3">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
}

// Type-safe font weight helper
export function createFontSpec(
  size: number,
  weight: FontSpec['weight'] = 'normal'
): Partial<FontSpec> {
  return { size, weight };
}