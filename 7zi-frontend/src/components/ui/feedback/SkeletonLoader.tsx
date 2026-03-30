/**
 * SkeletonLoader Component
 *
 * Content skeleton screen with multiple variants (text, card, list, table)
 *
 * @example
 * <SkeletonLoader variant="text" lines={3} />
 * <SkeletonLoader variant="card" />
 * <SkeletonLoader variant="list" items={5} />
 * <SkeletonLoader variant="table" rows={5} cols={4} />
 */

'use client';

import React, { memo } from 'react';

export type SkeletonVariant = 'text' | 'card' | 'list' | 'table';
export type SkeletonSize = 'sm' | 'md' | 'lg';

interface SkeletonLoaderProps {
  /**
   * Visual variant of the skeleton
   * @default 'text'
   */
  variant?: SkeletonVariant;

  /**
   * Size of the skeleton elements
   * @default 'md'
   */
  size?: SkeletonSize;

  /**
   * Number of lines (for 'text' variant)
   * @default 3
   */
  lines?: number;

  /**
   * Number of items (for 'list' variant)
   * @default 3
   */
  items?: number;

  /**
   * Number of rows (for 'table' variant)
   * @default 5
   */
  rows?: number;

  /**
   * Number of columns (for 'table' variant)
   * @default 4
   */
  cols?: number;

  /**
   * Whether to include header (for 'table' variant)
   * @default true
   */
  showHeader?: boolean;

  /**
   * Width of the skeleton (for 'text' variant, as percentage or pixels)
   * @default ['100%', '90%', '80%']
   */
  widths?: (string | number)[];

  /**
   * Whether the skeleton is animating
   * @default true
   */
  animate?: boolean;

  /**
   * Custom CSS class names
   */
  className?: string;

  /**
   * Custom style
   */
  style?: React.CSSProperties;
}

const sizeClasses: Record<SkeletonSize, string> = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

const sizeWidthClasses: Record<SkeletonSize, string> = {
  sm: 'w-12',
  md: 'w-16',
  lg: 'w-20',
};

/**
 * Base skeleton shimmer effect
 */
function Skeleton({
  className = '',
  animate = true,
  style,
}: {
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}) {
  const animationClass = animate ? 'animate-shimmer' : '';
  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700 rounded
        ${animationClass}
        ${className}
      `}
      style={style}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Text variant - skeleton lines
 */
function TextSkeleton({
  size = 'md',
  lines = 3,
  widths,
  animate = true,
}: {
  size?: SkeletonSize;
  lines?: number;
  widths?: (string | number)[];
  animate?: boolean;
}) {
  const defaultWidths: (string | number)[] = ['100%', '90%', '80%'];
  const finalWidths = widths ?? defaultWidths;

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`${sizeClasses[size]} ${i < finalWidths.length ? '' : 'w-3/4'}`}
          style={{ width: finalWidths[i % finalWidths.length] }}
          animate={animate}
        />
      ))}
    </div>
  );
}

/**
 * Card variant - skeleton card with header and content
 */
function CardSkeleton({
  size = 'md',
  animate = true,
}: {
  size?: SkeletonSize;
  animate?: boolean;
}) {
  const avatarSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-16 h-16' : 'w-12 h-12';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Skeleton className={`${avatarSize} rounded-full`} animate={animate} />
        <div className="flex-1 space-y-2">
          <Skeleton className={`${sizeClasses[size]} w-3/4`} animate={animate} />
          <Skeleton className={`${sizeClasses[size]} w-1/2`} animate={animate} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Skeleton className={`${sizeClasses[size]} w-full`} animate={animate} />
        <Skeleton className={`${sizeClasses[size]} w-5/6`} animate={animate} />
        <Skeleton className={`${sizeClasses[size]} w-4/6`} animate={animate} />
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <Skeleton className={`${sizeClasses[size]} ${sizeWidthClasses[size]} rounded`} animate={animate} />
        <Skeleton className={`${sizeClasses[size]} ${sizeWidthClasses[size]} rounded`} animate={animate} />
      </div>
    </div>
  );
}

/**
 * List variant - skeleton list items
 */
function ListSkeleton({
  size = 'md',
  items = 3,
  animate = true,
}: {
  size?: SkeletonSize;
  items?: number;
  animate?: boolean;
}) {
  const avatarSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Skeleton className={`${avatarSize} rounded-full`} animate={animate} />
          <div className="flex-1 space-y-2">
            <Skeleton className={`${sizeClasses[size]} w-3/4`} animate={animate} />
            <Skeleton className={`${sizeClasses[size]} w-1/2`} animate={animate} />
          </div>
          <Skeleton className={`${sizeClasses[size]} ${sizeWidthClasses[size]} rounded`} animate={animate} />
        </div>
      ))}
    </div>
  );
}

/**
 * Table variant - skeleton table with header and rows
 */
function TableSkeleton({
  size = 'md',
  rows = 5,
  cols = 4,
  showHeader = true,
  animate = true,
}: {
  size?: SkeletonSize;
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  animate?: boolean;
}) {
  return (
    <div className="w-full overflow-hidden">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {/* Header */}
        {showHeader && (
          <div className="grid gap-2 p-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton
                key={`header-${i}`}
                className={`${sizeClasses[size]} w-4/5`}
                animate={animate}
              />
            ))}
          </div>
        )}

        {/* Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-2 p-4"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton
                  key={`row-${rowIndex}-col-${colIndex}`}
                  className={`${sizeClasses[size]} w-full`}
                  animate={animate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Main SkeletonLoader component
 */
function SkeletonLoader({
  variant = 'text',
  size = 'md',
  lines,
  items,
  rows,
  cols,
  showHeader,
  widths,
  animate = true,
  className = '',
  style,
}: SkeletonLoaderProps) {
  const content = (
    <div className={className} style={style}>
      {variant === 'text' && <TextSkeleton size={size} lines={lines} widths={widths} animate={animate} />}
      {variant === 'card' && <CardSkeleton size={size} animate={animate} />}
      {variant === 'list' && <ListSkeleton size={size} items={items} animate={animate} />}
      {variant === 'table' && <TableSkeleton size={size} rows={rows} cols={cols} showHeader={showHeader} animate={animate} />}
    </div>
  );

  return content;
}

/**
 * Text skeleton shortcut
 */
export function TextSkeletonLines({
  lines = 3,
  size = 'md',
  animate = true,
}: {
  lines?: number;
  size?: SkeletonSize;
  animate?: boolean;
}) {
  return <SkeletonLoader variant="text" lines={lines} size={size} animate={animate} />;
}

/**
 * Card skeleton shortcut
 */
export function CardSkeletonLoader({
  size = 'md',
  animate = true,
}: {
  size?: SkeletonSize;
  animate?: boolean;
}) {
  return <SkeletonLoader variant="card" size={size} animate={animate} />;
}

/**
 * List skeleton shortcut
 */
export function ListSkeletonLoader({
  items = 3,
  size = 'md',
  animate = true,
}: {
  items?: number;
  size?: SkeletonSize;
  animate?: boolean;
}) {
  return <SkeletonLoader variant="list" items={items} size={size} animate={animate} />;
}

/**
 * Table skeleton shortcut
 */
export function TableSkeletonLoader({
  rows = 5,
  cols = 4,
  size = 'md',
  animate = true,
}: {
  rows?: number;
  cols?: number;
  size?: SkeletonSize;
  animate?: boolean;
}) {
  return <SkeletonLoader variant="table" rows={rows} cols={cols} size={size} animate={animate} />;
}

// Add keyframe animations for shimmer
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }

    .animate-shimmer {
      background: linear-gradient(to right, #e5e7eb 4%, #f3f4f6 25%, #e5e7eb 36%);
      background-size: 1000px 100%;
      animation: shimmer 2s infinite linear;
    }

    .dark .animate-shimmer {
      background: linear-gradient(to right, #374151 4%, #4b5563 25%, #374151 36%);
    }
  `;
  document.head.appendChild(style);
}

export default memo(SkeletonLoader);
