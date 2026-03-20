/**
 * Enhanced LoadingSpinner with Flickering Prevention
 *
 * Changes from original:
 * - Added minDisplayTime prop to prevent flickering
 * - Added optional progress support
 * - Improved animation consistency
 * - Added loading state management utilities
 *
 * @module components/LoadingSpinner
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner variant types
 */
export type LoadingVariant = 'spin' | 'pulse' | 'bounce' | 'dots' | 'bars' | 'wave';

/**
 * Loading spinner size presets
 */
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Loading spinner color variants
 */
export type LoadingColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'current';

/**
 * Loading spinner component props
 */
interface LoadingSpinnerProps {
  /** Loading variant (default: 'spin') */
  variant?: LoadingVariant;
  /** Size preset (default: 'md') */
  size?: LoadingSize;
  /** Color variant (default: 'primary') */
  color?: LoadingColor;
  /** Custom class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Custom label text */
  label?: string;
  /** Label position ('top', 'bottom', 'hidden') */
  labelPosition?: 'top' | 'bottom' | 'hidden';
  /** Minimum display time in ms (prevents flickering, default: 300) */
  minDisplayTime?: number;
  /** Show loading state (if false, component won't render even if loading) */
  isLoading?: boolean;
  /** Optional progress value (0-100) */
  progress?: number;
  /** Show percentage text when progress is provided */
  showProgress?: boolean;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
}

/**
 * Animation timing constants for consistency
 */
export const ANIMATION_TIMING = {
  duration: 300,
  minDisplay: 300,
  transition: 300,
} as const;

/**
 * Size configurations
 */
const SIZE_CONFIG: Record<LoadingSize, string> = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

/**
 * Color configurations
 */
const COLOR_CONFIG: Record<LoadingColor, string> = {
  primary: 'text-blue-600 dark:text-blue-400',
  secondary: 'text-gray-600 dark:text-gray-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-cyan-600 dark:text-cyan-400',
  current: 'text-current',
};

/**
 * Spin variant - rotating spinner
 */
const SpinVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => (
  <div
    className={cn(
      'animate-spin rounded-full border-2',
      'border-t-transparent',
      SIZE_CONFIG[size],
      COLOR_CONFIG[color]
    )}
  />
);

/**
 * Pulse variant - pulsing circle
 */
const PulseVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => (
  <div className={cn('relative', SIZE_CONFIG[size])}>
    <div
      className={cn(
        'absolute inset-0 rounded-full animate-ping opacity-75',
        COLOR_CONFIG[color]
      )}
      style={{ backgroundColor: 'currentColor' }}
    />
    <div
      className={cn(
        'relative rounded-full',
        COLOR_CONFIG[color]
      )}
      style={{ backgroundColor: 'currentColor' }}
    />
  </div>
);

/**
 * Bounce variant - bouncing dots
 */
const BounceVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => (
  <div className={cn('flex items-center space-x-1', SIZE_CONFIG[size])}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          'rounded-full animate-bounce',
          COLOR_CONFIG[color]
        )}
        style={{
          width: '30%',
          height: '30%',
          backgroundColor: 'currentColor',
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
);

/**
 * Dots variant - pulsing dots
 */
const DotsVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => {
  const dotSize = size === 'xs' ? 'w-1 h-1' : size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <div className="flex items-center space-x-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSize,
            'rounded-full',
            COLOR_CONFIG[color],
            'animate-pulse'
          )}
          style={{
            backgroundColor: 'currentColor',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Bars variant - pulsing bars
 */
const BarsVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => {
  const barHeight = size === 'xs' ? 'h-4' : size === 'sm' ? 'h-6' : size === 'md' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-16';
  return (
    <div className={cn('flex items-end space-x-1', barHeight)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1 animate-pulse',
            COLOR_CONFIG[color]
          )}
          style={{
            backgroundColor: 'currentColor',
            height: `${40 + i * 20}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Wave variant - wave animation
 */
const WaveVariant: React.FC<{ size: LoadingSize; color: LoadingColor }> = ({ size, color }) => {
  const barHeight = size === 'xs' ? 'h-4' : size === 'sm' ? 'h-6' : size === 'md' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-16';
  return (
    <div className={cn('flex items-end space-x-1', barHeight)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn('w-1', COLOR_CONFIG[color])}
          style={{
            backgroundColor: 'currentColor',
            height: `${40 + Math.sin(i * 0.8) * 30}%`,
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Main LoadingSpinner component with flickering prevention
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'spin',
  size = 'md',
  color = 'primary',
  className,
  style,
  label,
  labelPosition = 'hidden',
  minDisplayTime = ANIMATION_TIMING.minDisplay,
  isLoading = true,
  progress,
  showProgress = false,
  animationDuration = ANIMATION_TIMING.duration,
}) => {
  const [visible, setVisible] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const isMountedRef = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle visibility with minimum display time
  useEffect(() => {
    if (isLoading && !visible) {
      requestAnimationFrame(() => {
        if (isMountedRef.current) {
          setStartTime(Date.now());
          setVisible(true);
        }
      });
    } else if (!isLoading && visible) {
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
  }, [isLoading, visible, startTime, minDisplayTime]);

  const renderSpinner = useCallback(() => {
    switch (variant) {
      case 'spin':
        return <SpinVariant size={size} color={color} />;
      case 'pulse':
        return <PulseVariant size={size} color={color} />;
      case 'bounce':
        return <BounceVariant size={size} color={color} />;
      case 'dots':
        return <DotsVariant size={size} color={color} />;
      case 'bars':
        return <BarsVariant size={size} color={color} />;
      case 'wave':
        return <WaveVariant size={size} color={color} />;
      default:
        return <SpinVariant size={size} color={color} />;
    }
  }, [variant, size, color]);

  const displayProgress = progress !== undefined ? Math.max(0, Math.min(100, progress)) : undefined;

  if (!visible || !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        'transition-all duration-300',
        className
      )}
      style={{
        ...style,
        transitionDuration: `${animationDuration}ms`,
      }}
      role="status"
      aria-label={label || (displayProgress !== undefined ? `Loading: ${displayProgress}%` : 'Loading...')}
      aria-busy="true"
      aria-valuemax={displayProgress !== undefined ? 100 : undefined}
      aria-valuemin={displayProgress !== undefined ? 0 : undefined}
      aria-valuenow={displayProgress !== undefined ? Math.round(displayProgress) : undefined}
    >
      {labelPosition === 'top' && label && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-fade-in">
          {label}
        </p>
      )}
      {renderSpinner()}
      {labelPosition === 'bottom' && label && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 animate-fade-in">
          {label}
        </p>
      )}
      {showProgress && displayProgress !== undefined && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-fade-in">
          {Math.round(displayProgress)}%
        </p>
      )}
    </div>
  );
};

/**
 * Default export
 */
export default LoadingSpinner;
