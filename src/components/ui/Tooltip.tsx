/**
 * Tooltip Component
 *
 * A responsive tooltip component with positioning and animations.
 *
 * @module components/ui/Tooltip
 */

'use client';

import React, { useState, useRef, useEffect, cloneElement } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tooltip position types
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tooltip size presets
 */
export type TooltipSize = 'sm' | 'md' | 'lg';

/**
 * Tooltip component props
 */
export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Tooltip position (default: 'top') */
  position?: TooltipPosition;
  /** Tooltip size (default: 'md') */
  size?: TooltipSize;
  /** Show arrow (default: true) */
  showArrow?: boolean;
  /** Delay before showing (ms) (default: 200) */
  delay?: number;
  /** Hide delay (ms) (default: 100) */
  hideDelay?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Children component to wrap */
  children: React.ReactElement;
  /** Additional class name */
  className?: string;
}

/**
 * Size configurations
 */
const SIZE_CONFIG: Record<TooltipSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * Position configurations
 */
const POSITION_CONFIG: Record<TooltipPosition, { placement: string; arrow: string }> = {
  top: {
    placement: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent',
  },
  bottom: {
    placement: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent',
  },
  left: {
    placement: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-transparent border-b-transparent border-r-transparent',
  },
  right: {
    placement: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-transparent border-b-transparent border-l-transparent',
  },
};

/**
 * Main Tooltip component
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  size = 'md',
  showArrow = true,
  delay = 200,
  hideDelay = 100,
  disabled = false,
  children,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!isVisible) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        setIsPositioned(true);
      }, delay);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isVisible) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setIsPositioned(false);
      }, hideDelay);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const { placement, arrow } = POSITION_CONFIG[position];

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      {/* eslint-disable-next-line react-hooks/refs -- Clone element is used to wrap child with event handlers */}
      {cloneElement(children, {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      } as Partial<React.HTMLAttributes<HTMLElement>>)}

      {/* Tooltip */}
      {isVisible && !disabled && (
        <div
          className={cn(
            'absolute z-50 pointer-events-none',
            'bg-zinc-900 dark:bg-zinc-100',
            'text-white dark:text-zinc-900',
            'rounded-lg shadow-lg',
            'whitespace-nowrap',
            'animate-in fade-in zoom-in-95 duration-200',
            placement,
            SIZE_CONFIG[size],
            className
          )}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          {content}

          {/* Arrow */}
          {showArrow && (
            <div
              className={cn(
                'absolute w-0 h-0 border-4',
                arrow,
                position === 'top' && 'border-t-gray-900 dark:border-t-gray-100',
                position === 'bottom' && 'border-b-gray-900 dark:border-b-gray-100',
                position === 'left' && 'border-l-gray-900 dark:border-l-gray-100',
                position === 'right' && 'border-r-gray-900 dark:border-r-gray-100'
              )}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * SimpleTooltip - Simplified tooltip with default settings
 */
export interface SimpleTooltipProps extends Omit<TooltipProps, 'position' | 'size' | 'showArrow' | 'delay' | 'hideDelay'> {
  /** Tooltip position (default: 'top') */
  position?: TooltipPosition;
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({ position = 'top', ...props }) => (
  <Tooltip position={position} size="md" showArrow delay={200} hideDelay={100} {...props} />
);

/**
 * WithTooltip - Higher-order component to add tooltip to any element
 */
export function withTooltip<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tooltipContent: React.ReactNode,
  tooltipPosition: TooltipPosition = 'top'
) {
  const WithTooltipComponent = (props: P) => (
    <Tooltip content={tooltipContent} position={tooltipPosition}>
      <WrappedComponent {...props} />
    </Tooltip>
  );

  WithTooltipComponent.displayName = `withTooltip(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithTooltipComponent;
}

/**
 * InfoTooltip - A tooltip with info icon
 */
export interface InfoTooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Tooltip position (default: 'right') */
  position?: TooltipPosition;
  /** Icon size (default: 'md') */
  iconSize?: 'sm' | 'md' | 'lg';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  position = 'right',
  iconSize = 'md',
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Tooltip content={content} position={position}>
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400',
          'transition-colors',
          iconSizes[iconSize]
        )}
        type="button"
        aria-label="More information"
      >
        <svg
          className="w-full h-full"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Tooltip>
  );
};

export default Tooltip;
