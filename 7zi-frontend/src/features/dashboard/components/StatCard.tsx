'use client';

import { MetricCategory, METRIC_CATEGORIES } from '../types/dashboard';
import { formatNumber } from '../utils/format';

interface StatCardProps {
  title: string;
  value: number;
  unit?: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  trend?: Array<{ timestamp: number; value: number }>;
  category: MetricCategory;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  unit = '',
  change,
  changeType,
  trend,
  category,
  loading = false,
  className = '',
}: StatCardProps) {
  const categoryConfig = METRIC_CATEGORIES[category];
  const { icon: IconName, color } = categoryConfig;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </h3>
          <div className="flex items-baseline gap-2 mt-2">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(value)}
                </span>
                {unit && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {unit}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          {/* Use a simple SVG icon instead of Lucide icon */}
          <svg
            className="w-6 h-6"
            style={{ color }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {category === 'system' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            )}
            {category === 'application' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            )}
            {category === 'business' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            )}
            {category === 'workflow' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            )}
            {category === 'user' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            )}
            {category === 'performance' && (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Change indicator */}
      {change !== undefined && changeType && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              changeType === 'increase'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {changeType === 'increase' ? (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {change.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            与上期相比
          </span>
        </div>
      )}

      {/* Mini trend chart */}
      {trend && trend.length > 0 && !loading && (
        <div className="mt-4">
          <svg
            className="w-full h-12"
            viewBox={`0 0 ${trend.length * 30} 48`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={generateTrendPath(trend, 48)}
              fill={`url(#gradient-${title})`}
              stroke="none"
            />
            <path
              d={generateTrendPath(trend, 48)}
              fill="none"
              stroke={color}
              strokeWidth="2"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Generate SVG path for trend chart
 */
function generateTrendPath(data: Array<{ timestamp: number; value: number }>, height: number): string {
  if (data.length === 0) return '';

  const width = data.length * 30;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = i * 30 + 15;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  });

  return `M${points.join(' L ')} L${width},${height} L0,${height} Z`;
}

export default StatCard;