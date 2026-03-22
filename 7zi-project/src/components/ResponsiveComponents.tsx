'use client';

import React from 'react';
import { Children, ReactNode, isValidElement, cloneElement } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number | string;
}

/**
 * Responsive Grid Component
 * Automatically adjusts grid columns based on breakpoint
 *
 * Default column configuration:
 * - xs (320px+): 1 column
 * - sm (375px+): 1 column
 * - md (415px+): 2 columns
 * - lg (641px+): 3 columns
 * - xl (1025px+): 4 columns
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = {
    xs: 1,
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  },
  gap = 4
}) => {
  const getGridTemplate = () => {
    const xs = cols.xs || 1;
    const sm = cols.sm || xs;
    const md = cols.md || sm;
    const lg = cols.lg || md;
    const xl = cols.xl || lg;

    return `grid-template-columns: repeat(${xs}, 1fr);

            @media (min-width: 375px) {
              grid-template-columns: repeat(${sm}, 1fr);
            }

            @media (min-width: 415px) {
              grid-template-columns: repeat(${md}, 1fr);
            }

            @media (min-width: 641px) {
              grid-template-columns: repeat(${lg}, 1fr);
            }

            @media (min-width: 1025px) {
              grid-template-columns: repeat(${xl}, 1fr);
            }`;
  };

  const gapClass = typeof gap === 'number' ? `gap-${gap}` : gap;

  return (
    <div
      className={`grid ${gapClass} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols.xs || 1}, 1fr)`,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 2%)', // Fix for Safari
      }}
    >
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            key: child.key || index,
            ...(child.props as object)
          });
        }
        return child;
      })}
    </div>
  );
};

/**
 * Responsive Card Component
 * Automatically adjusts padding, margins, and font sizes based on breakpoint
 */
interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  hover = false,
  compact = false,
  onClick
}) => {
  const padding = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6 lg:p-8';
  const margin = 'm-2 sm:m-3 lg:m-4';
  const hoverClass = hover
    ? 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer'
    : '';
  const clickClass = onClick ? 'touch-active min-h-[44px]' : '';

  return (
    <div
      className={`
        bg-white dark:bg-zinc-900
        rounded-lg shadow-sm border
        ${padding}
        ${margin}
        ${hoverClass}
        ${clickClass}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Container Component
 * Provides consistent width constraints and centering
 */
interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  };

  return (
    <div
      className={`
        w-full mx-auto px-4 sm:px-6 lg:px-8
        ${maxWidthClasses[maxWidth]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * Responsive Text Component
 * Automatically scales font sizes based on breakpoint
 */
interface ResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small';
  className?: string;
  as?: React.ElementType;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  variant = 'body',
  className = '',
  as = 'p'
}) => {
  const variants = {
    h1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold',
    h2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold',
    h3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold',
    h4: 'text-base sm:text-lg md:text-xl lg:text-2xl font-medium',
    body: 'text-sm sm:text-base md:text-lg',
    small: 'text-xs sm:text-sm md:text-base'
  };

  const Tag = as as React.ElementType<React.HTMLAttributes<HTMLElement>>;

  return React.createElement(
    Tag,
    { className: `${variants[variant]} ${className}` },
    children
  );
};

/**
 * Responsive Button Component
 * Ensures touch-friendly minimum sizes and scales appropriately
 */
interface ResponsiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const variants = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800',
    outline: 'border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px] min-w-[36px]',
    md: 'px-4 py-2.5 text-sm sm:text-base min-h-[44px] min-w-[44px]',
    lg: 'px-6 py-3 text-base sm:text-lg min-h-[48px] min-w-[48px]'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-lg font-medium
        transition-all duration-200
        flex items-center justify-center gap-2
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${!disabled ? 'hover:scale-105' : ''}
        touch-active
        ${className}
      `}
    >
      {children}
    </button>
  );
};

/**
 * Responsive Input Component
 * Ensures touch-friendly input heights on mobile
 */
interface ResponsiveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const ResponsiveInput: React.FC<ResponsiveInputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const inputHeight = 'h-11 sm:h-12'; // 44px minimum for touch, 48px for desktop

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full
          ${inputHeight}
          px-3 sm:px-4
          border
          rounded-lg
          text-sm sm:text-base
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-zinc-600 focus:border-cyan-500'
          }
          ${props.disabled ? 'bg-gray-100 dark:bg-zinc-800 cursor-not-allowed' : 'bg-white dark:bg-zinc-900'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
