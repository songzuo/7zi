/**
 * LoadingState Component
 *
 * Unified loading state display component with multiple variants
 *
 * @example
 * <LoadingState variant="spinner" size="md" />
 * <LoadingState variant="dots" size="lg" />
 * <LoadingState variant="bar" progress={75} />
 */

'use client';

import React, { memo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

export type LoadingVariant = 'spinner' | 'dots' | 'bar' | 'pulse';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingStateProps {
  /**
   * Visual variant of the loading state
   * @default 'spinner'
   */
  variant?: LoadingVariant;

  /**
   * Size of the loading indicator
   * @default 'md'
   */
  size?: LoadingSize;

  /**
   * Custom text to display below the loader
   */
  text?: string;

  /**
   * Progress value (0-100) for 'bar' variant
   */
  progress?: number;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Whether to show overlay with backdrop
   * @default false
   */
  overlay?: boolean;

  /**
   * Custom loading message for accessibility
   * @default 'Loading...'
   */
  ariaLabel?: string;
}

const sizeClasses: Record<LoadingSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const textSizeClasses: Record<LoadingSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

/**
 * Spinner variant - circular loader
 */
function SpinnerLoader({ size }: { size: LoadingSize }) {
  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} text-blue-500`} />
  );
}

/**
 * Dots variant - animated dots
 */
function DotsLoader({ size }: { size: LoadingSize }) {
  const dotSizes: Record<LoadingSize, string> = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${dotSizes[size]} bg-blue-500 rounded-full
            animate-bounce
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Bar variant - progress bar
 */
function BarLoader({ progress, size }: { progress?: number; size: LoadingSize }) {
  const heightClasses: Record<LoadingSize, string> = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  };

  return (
    <div className="w-full">
      <div className={`w-full ${heightClasses[size]} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{
            width: progress !== undefined ? `${Math.min(100, Math.max(0, progress))}%` : '100%',
            animation: progress === undefined ? 'pulse-bar 1.5s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      {progress !== undefined && (
        <div className={`text-right mt-1 ${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}>
          {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}

/**
 * Pulse variant - pulsing circle
 */
function PulseLoader({ size }: { size: LoadingSize }) {
  return (
    <div className="relative">
      <div className={`absolute inset-0 ${sizeClasses[size]} bg-blue-500 rounded-full opacity-25 animate-ping`} />
      <div className={`relative ${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`} />
    </div>
  );
}

function LoadingState({
  variant = 'spinner',
  size = 'md',
  text,
  progress,
  className = '',
  overlay = false,
  ariaLabel = 'Loading...',
}: LoadingStateProps) {
  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {variant === 'spinner' && <SpinnerLoader size={size} />}
      {variant === 'dots' && <DotsLoader size={size} />}
      {variant === 'bar' && <BarLoader progress={progress} size={size} />}
      {variant === 'pulse' && <PulseLoader size={size} />}

      {text && (
        <div className={`mt-3 ${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}>
          {text}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {content}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" aria-label={ariaLabel}>
      {content}
    </div>
  );
}

/**
 * Inline loading state for small spaces
 */
export function InlineLoading({
  size = 'sm',
  text,
}: {
  size?: LoadingSize;
  text?: string;
}) {
  return (
    <LoadingState variant="spinner" size={size} text={text} />
  );
}

/**
 * Page loading state for full page loading
 */
export function PageLoading({
  text = 'Loading page...',
}: {
  text?: string;
}) {
  return (
    <LoadingState
      variant="spinner"
      size="xl"
      text={text}
      overlay
      className="h-screen"
    />
  );
}

/**
 * Component loading state for component-level loading
 */
export function ComponentLoading({
  text = 'Loading...',
  minHeight = 200,
}: {
  text?: string;
  minHeight?: number;
}) {
  return (
    <div
      className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg"
      style={{ minHeight }}
    >
      <LoadingState variant="dots" size="md" text={text} />
    </div>
  );
}

// Add keyframe animations for pulse-bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-bar {
      0%, 100% { width: 0%; }
      50% { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}

export default memo(LoadingState);
