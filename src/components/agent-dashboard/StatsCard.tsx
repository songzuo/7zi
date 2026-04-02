/**
 * Agent Dashboard - Stats Card Component
 *
 * Glassmorphism-style statistics card for displaying key metrics
 */

'use client'

import { useMemo } from 'react'
import { useDarkMode } from '@/stores/preferencesStore'

// ============================================================================
// Types
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'stable'

export interface StatsCardProps {
  /** Card title */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional unit (e.g., "ms", "%", "tasks") */
  unit?: string
  /** Icon emoji or string */
  icon: string
  /** Trend direction */
  trend?: TrendDirection
  /** Trend percentage/value */
  trendValue?: string
  /** Card variant */
  variant?: 'default' | 'success' | 'warning' | 'info'
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function StatsCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendValue,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const isDark = useDarkMode()

  // Variant styles
  const variantStyles = useMemo(
    () => ({
      default: {
        bg: isDark
          ? 'bg-gradient-to-br from-zinc-800/80 to-zinc-900/80'
          : 'bg-gradient-to-br from-white/90 to-zinc-50/90',
        border: 'border-zinc-200/50 dark:border-zinc-700/50',
        accent: 'from-blue-500/20 to-purple-500/20',
        textColor: isDark ? 'text-white' : 'text-zinc-900',
        subtextColor: isDark ? 'text-zinc-400' : 'text-zinc-600',
      },
      success: {
        bg: isDark
          ? 'bg-gradient-to-br from-emerald-900/40 to-zinc-900/80'
          : 'bg-gradient-to-br from-emerald-50/90 to-white/90',
        border: 'border-emerald-200/50 dark:border-emerald-800/50',
        accent: 'from-emerald-500/30 to-green-500/20',
        textColor: isDark ? 'text-emerald-400' : 'text-emerald-700',
        subtextColor: isDark ? 'text-emerald-400/70' : 'text-emerald-600',
      },
      warning: {
        bg: isDark
          ? 'bg-gradient-to-br from-amber-900/40 to-zinc-900/80'
          : 'bg-gradient-to-br from-amber-50/90 to-white/90',
        border: 'border-amber-200/50 dark:border-amber-800/50',
        accent: 'from-amber-500/30 to-orange-500/20',
        textColor: isDark ? 'text-amber-400' : 'text-amber-700',
        subtextColor: isDark ? 'text-amber-400/70' : 'text-amber-600',
      },
      info: {
        bg: isDark
          ? 'bg-gradient-to-br from-blue-900/40 to-zinc-900/80'
          : 'bg-gradient-to-br from-blue-50/90 to-white/90',
        border: 'border-blue-200/50 dark:border-blue-800/50',
        accent: 'from-blue-500/30 to-cyan-500/20',
        textColor: isDark ? 'text-blue-400' : 'text-blue-700',
        subtextColor: isDark ? 'text-blue-400/70' : 'text-blue-600',
      },
    }),
    [isDark, variant]
  )

  const styles = variantStyles[variant]

  // Trend styles
  const trendStyles = useMemo(() => {
    if (!trend) return ''

    switch (trend) {
      case 'up':
        return isDark ? 'text-emerald-400' : 'text-emerald-600'
      case 'down':
        return isDark ? 'text-red-400' : 'text-red-600'
      default:
        return isDark ? 'text-zinc-400' : 'text-zinc-600'
    }
  }, [trend, isDark])

  const trendIcon = useMemo(() => {
    switch (trend) {
      case 'up':
        return '↑'
      case 'down':
        return '↓'
      default:
        return '→'
    }
  }, [trend])

  return (
    <div
      className={`relative overflow-hidden rounded-xl border backdrop-blur-sm ${styles.bg} ${styles.border} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${className} `}
    >
      {/* Accent gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.accent} opacity-0 transition-opacity duration-300 hover:opacity-100`}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Header: Icon + Title */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-2xl" role="img" aria-label={title}>
            {icon}
          </span>
          <span className={`text-sm font-medium ${styles.subtextColor}`}>{title}</span>
        </div>

        {/* Main Value */}
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${styles.textColor}`}>{value}</span>
          {unit && <span className={`text-sm ${styles.subtextColor}`}>{unit}</span>}
        </div>

        {/* Trend Indicator */}
        {trend && trendValue && (
          <div className={`mt-2 flex items-center gap-1 text-sm ${trendStyles}`}>
            <span>{trendIcon}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {/* Glassmorphism shine effect */}
      <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default StatsCard
