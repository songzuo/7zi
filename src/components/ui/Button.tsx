'use client';

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gradient' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Icon on the left */
  leftIcon?: ReactNode;
  /** Icon on the right */
  rightIcon?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Children */
  children: ReactNode;
}

// ============================================
// STYLES
// ============================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-blue-600 text-white 
    hover:bg-blue-700 
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    dark:bg-blue-500 dark:hover:bg-blue-600
  `,
  secondary: `
    bg-zinc-200 text-zinc-900 
    hover:bg-zinc-300 
    dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700
  `,
  danger: `
    bg-red-600 text-white 
    hover:bg-red-700 
    focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    dark:bg-red-500 dark:hover:bg-red-600
  `,
  ghost: `
    bg-transparent text-zinc-700 
    hover:bg-zinc-100 
    dark:text-zinc-300 dark:hover:bg-zinc-800
  `,
  gradient: `
    bg-gradient-to-r from-cyan-500 to-purple-600 text-white 
    hover:from-cyan-600 hover:to-purple-700 
    hover:shadow-lg hover:shadow-cyan-500/25
  `,
  outline: `
    border-2 border-zinc-300 bg-transparent text-zinc-700 
    hover:border-cyan-500 hover:text-cyan-500 
    dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-cyan-400 dark:hover:text-cyan-400
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-6 py-3 text-base font-medium rounded-xl gap-2',
  xl: 'px-8 py-4 text-lg font-semibold rounded-full gap-3',
};

const baseStyles = `
  inline-flex items-center justify-center
  transition-all duration-200 ease-in-out
  focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed
  font-medium
`;

// ============================================
// LOADING SPINNER
// ============================================

function LoadingSpinner({ size }: { size: ButtonSize }) {
  const sizeMap: Record<ButtonSize, string> = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <svg
      className={`animate-spin ${sizeMap[size]}`}
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
}

// ============================================
// COMPONENT
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      >
        {loading && <LoadingSpinner size={size} />}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className={loading ? 'opacity-0' : ''}>{children}</span>
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// ICON BUTTON VARIANT
// ============================================

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon element */
  icon: ReactNode;
  /** Accessible label */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const sizeMap: Record<ButtonSize, string> = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
      xl: 'p-3',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={`${sizeMap[size]} ${className}`}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================
// BUTTON GROUP
// ============================================

export interface ButtonGroupProps {
  /** Button elements */
  children: ReactNode;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Gap between buttons */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  gap = 'md',
  className = '',
}: ButtonGroupProps) {
  const gapStyles = {
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div
      className={`
        flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${gapStyles[gap]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
    >
      {children}
    </div>
  );
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default Button;
