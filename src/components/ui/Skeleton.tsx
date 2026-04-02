'use client'

import { cn } from '@/lib/utils'
import { forwardRef, HTMLAttributes } from 'react'

/**
 * Skeleton Component - Loading placeholder with animation
 *
 * Design spec from v1.9.0:
 * - Multiple variants: text, circle, rect, card
 * - Shimmer animation effect
 * - Responsive sizing
 * - Dark mode compatible
 */

// =============================================================================
// Types
// =============================================================================

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'rounded'
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'none'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: SkeletonVariant
  /** Animation type */
  animation?: SkeletonAnimation
  /** Width (CSS value) */
  width?: string | number
  /** Height (CSS value) */
  height?: string | number
  /** Additional CSS classes */
  className?: string
}

export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number
  /** Last line width percentage */
  lastLineWidth?: string | number
  /** Additional CSS classes */
  className?: string
}

export interface SkeletonCardProps {
  /** Show image placeholder */
  hasImage?: boolean
  /** Show avatar placeholder */
  hasAvatar?: boolean
  /** Number of text lines */
  lines?: number
  /** Show action buttons */
  hasActions?: boolean
  /** Additional CSS classes */
  className?: string
}

export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  cols?: number
  /** Show header */
  hasHeader?: boolean
  /** Additional CSS classes */
  className?: string
}

export interface SkeletonListProps {
  /** Number of items */
  items?: number
  /** Show avatar */
  hasAvatar?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const VARIANT_STYLES: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circle: 'rounded-full',
  rect: 'rounded-none',
  rounded: 'rounded-lg',
}

const ANIMATION_STYLES: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  shimmer: 'skeleton-shimmer',
  none: '',
}

// =============================================================================
// Base Skeleton Component
// =============================================================================

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', animation = 'shimmer', width, height, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'bg-zinc-200 dark:bg-zinc-700/60',
          // Variant
          VARIANT_STYLES[variant],
          // Animation
          ANIMATION_STYLES[animation],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// =============================================================================
// Preset Components
// =============================================================================

/**
 * Multi-line text skeleton
 */
export function SkeletonText({ lines = 3, lastLineWidth = '60%', className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-4"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

/**
 * Card skeleton with optional image, avatar, and actions
 */
export function SkeletonCard({
  hasImage = true,
  hasAvatar = false,
  lines = 2,
  hasActions = true,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700/50',
        'bg-white dark:bg-zinc-800/50',
        className
      )}
    >
      {/* Image placeholder */}
      {hasImage && <Skeleton variant="rounded" className="h-32 w-full" />}

      {/* Header with optional avatar */}
      <div className={cn('flex items-center gap-3', !hasImage && 'pt-0')}>
        {hasAvatar && <Skeleton variant="circle" className="h-10 w-10 flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-5 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>

      {/* Text content */}
      <SkeletonText lines={lines} lastLineWidth="75%" />

      {/* Action buttons */}
      {hasActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton variant="rounded" className="h-9 w-20" />
          <Skeleton variant="rounded" className="h-9 w-16" />
        </div>
      )}
    </div>
  )
}

/**
 * Table skeleton
 */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  hasHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700/50',
        className
      )}
    >
      {/* Header */}
      {hasHeader && (
        <div className="flex gap-4 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700/50 dark:bg-zinc-800/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      )}

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'flex gap-4 p-4',
            'border-b border-zinc-100 dark:border-zinc-700/30',
            rowIndex === rows - 1 && 'border-0'
          )}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * List item skeleton
 */
export function SkeletonList({ items = 5, hasAvatar = true, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn('flex items-center gap-3 rounded-lg p-3', 'bg-zinc-50 dark:bg-zinc-800/30')}
        >
          {hasAvatar && <Skeleton variant="circle" className="h-10 w-10 flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/2" />
            <Skeleton variant="text" className="h-3 w-3/4" />
          </div>
          <Skeleton variant="rounded" className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Dashboard stat card skeleton
 */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 p-6 dark:border-zinc-700/50',
        'bg-white dark:bg-zinc-800/50',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="circle" className="h-8 w-8" />
      </div>
      <Skeleton variant="text" className="mb-2 h-8 w-32" />
      <Skeleton variant="text" className="h-3 w-20" />
    </div>
  )
}

/**
 * Settings form skeleton
 */
export function SkeletonSettingsForm({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="rounded" className="h-10 w-full max-w-md" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton variant="rounded" className="h-10 w-24" />
        <Skeleton variant="rounded" className="h-10 w-20" />
      </div>
    </div>
  )
}

// =============================================================================
// CSS Animation Styles (inject via globals.css)
// =============================================================================

/**
 * Add to globals.css:
 *
 * @keyframes skeleton-shimmer {
 *   0% { background-position: -200% 0; }
 *   100% { background-position: 200% 0; }
 * }
 *
 * .skeleton-shimmer {
 *   background: linear-gradient(
 *     90deg,
 *     transparent 0%,
 *     rgba(255, 255, 255, 0.4) 50%,
 *     transparent 100%
 *   );
 *   background-size: 200% 100%;
 *   animation: skeleton-shimmer 1.5s ease-in-out infinite;
 * }
 *
 * .dark .skeleton-shimmer {
 *   background: linear-gradient(
 *     90deg,
 *     transparent 0%,
 *     rgba(255, 255, 255, 0.1) 50%,
 *     transparent 100%
 *   );
 *   background-size: 200% 100%;
 * }
 *
 * @media (prefers-reduced-motion: reduce) {
 *   .skeleton-shimmer {
 *     animation: none;
 *   }
 * }
 */

// =============================================================================
// Export
// =============================================================================

export default Skeleton
