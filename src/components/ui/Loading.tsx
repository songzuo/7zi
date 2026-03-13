import React from 'react';

export type LoadingVariant = 'spinner' | 'skeleton' | 'progress';

export interface LoadingProps {
  /** Loading style variant */
  variant?: LoadingVariant;
  /** Additional CSS classes */
  className?: string;
  /** Size of the loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Text label to display */
  label?: string;
  /** For progress variant: current value (0-100) */
  progress?: number;
  /** For skeleton variant: custom width */
  width?: string;
  /** For skeleton variant: custom height */
  height?: string;
}

/**
 * Global Loading component with multiple variants
 * Supports: spinner, skeleton, and progress styles
 */
export default function Loading({
  variant = 'spinner',
  className = '',
  size = 'md',
  label,
  progress,
  width,
  height,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const renderSpinner = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const renderSkeleton = () => {
    const defaultHeights = {
      sm: 'h-3',
      md: 'h-4',
      lg: 'h-6',
    };

    return (
      <div
        className={`animate-pulse bg-muted rounded ${defaultHeights[size]} ${className}`}
        style={{ width: width, height: height || defaultHeights[size].replace('h-', 'h-') }}
        aria-hidden="true"
      />
    );
  };

  const renderProgress = () => {
    const clampedProgress = Math.min(100, Math.max(0, progress || 0));
    
    return (
      <div className={`w-full ${className}`} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100}>
        <div className="flex justify-between mb-1">
          {label && (
            <span className={`text-sm font-medium text-foreground ${labelSizeClasses[size]}`}>
              {label}
            </span>
          )}
          <span className={`text-sm font-medium text-foreground ${labelSizeClasses[size]}`}>
            {clampedProgress}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {variant === 'spinner' && renderSpinner()}
      {variant === 'skeleton' && renderSkeleton()}
      {variant === 'progress' && renderProgress()}
      {label && variant !== 'progress' && (
        <span className={`text-muted-foreground ${labelSizeClasses[size]}`}>
          {label}
        </span>
      )}
    </div>
  );
}
