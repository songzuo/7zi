'use client';

/**
 * StatsCard - 统计数据卡片组件
 *
 * 用于显示关键业务指标：总agents、总用户、总tokens、收入等
 * 支持响应式设计和移动端友好
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { FC } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

export interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan';
  trend?: {
    value: number;
    period?: string;
  };
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// 颜色配置
// ============================================================================

const colorConfig = {
  blue: {
    bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/30'
  },
  green: {
    bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10',
    text: 'text-green-600 dark:text-green-400',
    icon: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800/30'
  },
  purple: {
    bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/30'
  },
  orange: {
    bg: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10',
    text: 'text-orange-600 dark:text-orange-400',
    icon: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/30'
  },
  pink: {
    bg: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/10',
    text: 'text-pink-600 dark:text-pink-400',
    icon: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800/30'
  },
  cyan: {
    bg: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    icon: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800/30'
  }
};

const sizeConfig = {
  sm: { padding: 'p-3', title: 'text-xs', value: 'text-lg font-bold', icon: 'w-8 h-8' },
  md: { padding: 'p-4', title: 'text-sm', value: 'text-2xl font-bold', icon: 'w-10 h-10' },
  lg: { padding: 'p-6', title: 'text-base', value: 'text-3xl font-bold', icon: 'w-12 h-12' }
};

// ============================================================================
// 组件实现
// ============================================================================

export const StatsCard: FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  loading = false,
  size = 'md',
  onClick,
  className = ''
}) => {
  const config = colorConfig[color];
  const sizes = sizeConfig[size];

  if (loading) {
    return (
      <div className={`${sizes.padding} bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30 rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2"></div>
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const trendValue = trend?.value ?? 0;
  const TrendIcon = trendValue > 0 ? TrendingUp : trendValue < 0 ? TrendingDown : Minus;
  const trendColor = trendValue > 0 ? 'text-green-600 dark:text-green-400' : trendValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500';

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        ${sizes.padding} bg-gradient-to-br ${config.bg}
        dark:bg-gradient-to-br ${config.bg.split(' ').slice(-2).join(' ')}
        rounded-xl border ${config.border}
        transition-all duration-300
        hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
    >
      {/* 装饰性背景 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-bl-full -mr-4 -mt-4" />

      <div className="relative">
        {/* 顶部：标题和图标 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`${sizes.title} font-medium text-zinc-600 dark:text-zinc-400 truncate`}>
              {title}
            </h3>
          </div>
          {Icon && (
            <div className={`${sizes.icon} rounded-xl ${config.icon} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* 中部：数值 */}
        <div className={`mt-3 ${sizes.value} ${config.text} truncate`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {/* 底部：趋势 */}
        {trend && (
          <div className="mt-2 flex items-center gap-2">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className={`text-xs font-medium ${trendColor}`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            {trend.period && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ({trend.period})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default StatsCard;
