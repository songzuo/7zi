/**
 * Skeleton Loading States for Analytics Dashboard
 */

import type { FC, CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton: FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-zinc-200 dark:bg-zinc-700'

  const variantClasses = {
    text: 'h-4 rounded w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[wave_1.5s_infinite]',
    none: '',
  }

  const style: CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Metric Card Skeleton
export const MetricCardSkeleton: FC = () => (
  <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
    <div className="mb-4 flex items-center justify-between">
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton variant="text" width={60} height={20} />
    </div>
    <Skeleton variant="text" height={32} className="mb-2" />
    <Skeleton variant="text" width={120} height={20} />
  </div>
)

// Import for LoadingOverlay
import { RefreshCw } from 'lucide-react'

// Chart Skeleton
export const ChartSkeleton: FC<{ height?: number }> = ({ height = 350 }) => (
  <div
    className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
    style={{ height }}
  >
    <Skeleton variant="text" width={150} height={24} className="mb-6" />
    <div className="flex h-full min-h-[250px] items-center justify-center">
      <div className="text-center">
        <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-zinc-400" />
        <Skeleton variant="text" width={100} height={20} className="mx-auto" />
      </div>
    </div>
  </div>
)

// Loading Overlay
export const LoadingOverlay: FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <RefreshCw className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">{message || 'Loading...'}</p>
    </div>
  </div>
)

// Grid of skeleton metric cards
export const MetricsGridSkeleton: FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <MetricCardSkeleton key={i} />
    ))}
  </div>
)
