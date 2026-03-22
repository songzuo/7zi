/**
 * GlobalLoader Component
 *
 * A full-screen loading overlay that displays global loading state
 * with progress tracking and customizable appearance.
 *
 * @module components/GlobalLoader
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useGlobalLoading } from '@/hooks/useGlobalLoading';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

/**
 * GlobalLoader overlay variant
 */
export type LoaderVariant = 'overlay' | 'inline' | 'minimal';

/**
 * GlobalLoader component props
 */
interface GlobalLoaderProps {
  /** Display variant (default: 'overlay') */
  variant?: LoaderVariant;
  /** Show progress bar */
  showProgress?: boolean;
  /** Custom backdrop opacity (default: 'bg-black/50') */
  backdrop?: string;
  /** Custom z-index (default: 'z-50') */
  zIndex?: string;
  /** Spinner variant */
  spinnerVariant?: 'spin' | 'pulse' | 'dots' | 'bars' | 'wave';
  /** Spinner color */
  spinnerColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Minimum display time in ms (prevents flickering) */
  minDisplayTime?: number;
  /** Additional class name */
  className?: string;
}

/**
 * GlobalLoader component - displays full-screen loading overlay
 *
 * @example
 * // Basic usage (auto-controlled by useGlobalLoading)
 * <GlobalLoader />
 *
 * @example
 * // With progress bar and custom styling
 * <GlobalLoader
 *   showProgress={true}
 *   backdrop="bg-white/80"
 *   spinnerVariant="bars"
 *   spinnerColor="primary"
 * />
 *
 * @example
 * // Inline variant for embedded loading
 * <GlobalLoader variant="inline" />
 */
export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  variant = 'overlay',
  showProgress = false,
  backdrop = 'bg-black/50 dark:bg-white/50',
  zIndex = 'z-50',
  spinnerVariant = 'spin',
  spinnerColor = 'primary',
  minDisplayTime = 300,
  className,
}) => {
  const { state } = useGlobalLoading();

  // Prevent flickering by enforcing minimum display time
  const [visible, setVisible] = React.useState(false);
  const [startTime, setStartTime] = React.useState<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.isLoading && !visible) {
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setStartTime(Date.now());
          setVisible(true);
        }
      });
    } else if (!state.isLoading && visible) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      if (remaining > 0) {
        const timeout = setTimeout(() => {
          if (isMountedRef.current) {
            setVisible(false);
          }
        }, remaining);
        return () => clearTimeout(timeout);
      } else {
        requestAnimationFrame(() => {
          if (isMountedRef.current) {
            setVisible(false);
          }
        });
      }
    }
  }, [state.isLoading, visible, startTime, minDisplayTime]);

  if (!visible || !state.isLoading) {
    return null;
  }

  // Overlay variant - full screen
  if (variant === 'overlay') {
    return (
      <div
        className={cn(
          'fixed inset-0 flex items-center justify-center',
          'backdrop-blur-sm transition-opacity duration-300',
          backdrop,
          zIndex,
          className
        )}
        role="status"
        aria-label={state.message || 'Loading...'}
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-6 p-8 bg-white/90 dark:bg-zinc-900/90 rounded-2xl shadow-2xl">
          <LoadingSpinner
            variant={spinnerVariant}
            size="xl"
            color={spinnerColor}
          />
          {state.message && (
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 animate-pulse">
              {state.message}
            </p>
          )}
          {showProgress && state.progress > 0 && (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 text-center">
                {Math.round(state.progress)}%
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - embedded in content
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-3 p-4',
          'bg-zinc-50 dark:bg-zinc-800/50',
          'border border-zinc-200 dark:border-zinc-700',
          'rounded-lg',
          className
        )}
        role="status"
        aria-label={state.message || 'Loading...'}
        aria-busy="true"
      >
        <LoadingSpinner
          variant={spinnerVariant}
          size="md"
          color={spinnerColor}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {state.message || 'Loading...'}
          </p>
          {showProgress && state.progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Minimal variant - just spinner and text
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3',
        className
      )}
      role="status"
      aria-label={state.message || 'Loading...'}
      aria-busy="true"
    >
      <LoadingSpinner
        variant={spinnerVariant}
        size="lg"
        color={spinnerColor}
      />
      {state.message && (
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {state.message}
        </p>
      )}
      {showProgress && state.progress > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {Math.round(state.progress)}%
        </p>
      )}
    </div>
  );
};

/**
 * Minimal loader - compact version without backdrop
 */
export const MinimalLoader: React.FC<{ message?: string }> = ({ message }) => (
  <GlobalLoader variant="minimal" className={message ? '' : 'sr-only'} />
);

/**
 * Default export
 */
export default GlobalLoader;
