'use client';

/**
 * PerformanceMetrics Component
 * 性能指标卡片组件
 *
 * 显示 Web Vitals 核心指标：LCP, FID, CLS, INP
 */

import React, { useMemo } from 'react';
import {
  Activity,
  Clock,
  Layout,
  MousePointer,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { WebVitalsMetrics } from '@/lib/hooks/useWebVitals';

// ============================================
// Type Definitions
// ============================================

export interface PerformanceMetricsProps {
  metrics: WebVitalsMetrics;
  locale?: 'en' | 'zh';
  showRating?: boolean;
  className?: string;
}

interface MetricConfig {
  key: keyof WebVitalsMetrics;
  label: { en: string; zh: string };
  icon: React.ComponentType<{ className?: string }>;
  unit: string;
  decimals?: number;
  format?: (value: number) => string;
}

// ============================================
// Constants
// ============================================

const RATING_COLORS = {
  good: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  'needs-improvement': 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  poor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
};

const RATING_ICONS = {
  good: CheckCircle,
  'needs-improvement': AlertTriangle,
  poor: AlertTriangle,
};

const METRICS_CONFIG: MetricConfig[] = [
  {
    key: 'LCP',
    label: { en: 'Largest Contentful Paint', zh: '最大内容绘制' },
    icon: Activity,
    unit: 'ms',
  },
  {
    key: 'FID',
    label: { en: 'First Input Delay', zh: '首次输入延迟' },
    icon: MousePointer,
    unit: 'ms',
  },
  {
    key: 'CLS',
    label: { en: 'Cumulative Layout Shift', zh: '累积布局偏移' },
    icon: Layout,
    unit: '',
    decimals: 3,
  },
  {
    key: 'INP',
    label: { en: 'Interaction to Next Paint', zh: '交互到下一次绘制' },
    icon: Zap,
    unit: 'ms',
  },
  {
    key: 'FCP',
    label: { en: 'First Contentful Paint', zh: '首次内容绘制' },
    icon: Clock,
    unit: 'ms',
  },
  {
    key: 'TTFB',
    label: { en: 'Time to First Byte', zh: '首字节时间' },
    icon: TrendingUp,
    unit: 'ms',
  },
];

// ============================================
// Rating Thresholds
// ============================================

const RATING_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(
  key: keyof WebVitalsMetrics,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = RATING_THRESHOLDS[key];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function formatValue(
  value: number,
  unit: string,
  decimals?: number
): string {
  const formatted = decimals !== undefined
    ? value.toFixed(decimals)
    : value.toFixed(0);
  return `${formatted} ${unit}`;
}

// ============================================
// Sub-components
// ============================================

interface MetricCardProps {
  config: MetricConfig;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  showRating: boolean;
  locale: 'en' | 'zh';
}

const MetricCard: React.FC<MetricCardProps> = ({
  config,
  value,
  rating,
  showRating,
  locale,
}) => {
  const RatingIcon = RATING_ICONS[rating];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-lg">
            <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {config.label[locale]}
          </span>
        </div>
        {showRating && (
          <div className={`p-1.5 rounded-full ${RATING_COLORS[rating]}`}>
            <RatingIcon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
          {formatValue(value, config.unit, config.decimals)}
        </p>
        <div className="flex items-center gap-2">
          <div className={`text-xs px-2 py-0.5 rounded-full ${RATING_COLORS[rating]}`}>
            {locale === 'zh'
              ? {
                  good: '良好',
                  'needs-improvement': '需改进',
                  poor: '差',
                }[rating]
              : rating.charAt(0).toUpperCase() + rating.slice(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  locale = 'en',
  showRating = true,
  className = '',
}) => {
  const t = {
    title: locale === 'zh' ? '性能指标' : 'Performance Metrics',
    noData: locale === 'zh' ? '暂无数据' : 'No data available',
    loading: locale === 'zh' ? '收集中...' : 'Collecting...',
  };

  const availableMetrics = useMemo(() => {
    return METRICS_CONFIG.filter((config) => metrics[config.key] !== undefined);
  }, [metrics]);

  const overallRating = useMemo(() => {
    const ratings = availableMetrics.map((config) => {
      const value = metrics[config.key]!;
      return getRating(config.key, value);
    });

    if (ratings.length === 0) return null;

    // If any metric is poor, overall is poor
    if (ratings.includes('poor')) return 'poor';
    // If any metric needs improvement, overall is needs-improvement
    if (ratings.includes('needs-improvement')) return 'needs-improvement';
    return 'good';
  }, [availableMetrics, metrics]);

  if (Object.keys(metrics).length === 0) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Activity className="w-8 h-8 text-zinc-400 mb-2" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {locale === 'zh' ? 'Web Vitals 核心指标' : 'Web Vitals Core Metrics'}
          </p>
        </div>
        {overallRating && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${RATING_COLORS[overallRating]}`}>
            {React.createElement(RATING_ICONS[overallRating], {
              className: 'w-4 h-4',
            })}
            <span className="text-sm font-medium">
              {locale === 'zh'
                ? {
                    good: '整体良好',
                    'needs-improvement': '需优化',
                    poor: '需要改进',
                  }[overallRating]
                : {
                    good: 'Overall Good',
                    'needs-improvement': 'Needs Optimization',
                    poor: 'Needs Improvement',
                  }[overallRating]}
            </span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {availableMetrics.map((config) => {
          const value = metrics[config.key]!;
          const rating = getRating(config.key, value);

          return (
            <MetricCard
              key={config.key}
              config={config}
              value={value}
              rating={rating}
              showRating={showRating}
              locale={locale}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
