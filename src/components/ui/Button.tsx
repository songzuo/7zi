/**
 * Button Component
 *
 * A flexible, responsive button component with multiple variants, sizes, and states.
 * Supports internationalization via optional textKey prop.
 *
 * @module components/ui/Button
 */

'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { FC } from 'react';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

/**
 * Button size presets
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Button component props
 */
export interface ButtonProps extends Omit<JSX.IntrinsicElements['button'], 'size'> {
  /** Button variant (default: 'primary') */
  variant?: ButtonVariant;
  /** Size preset (default: 'md') */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Disabled state (loading also disables the button) */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon element to display */
  icon?: ReactNode;
  /** Icon position (default: 'left') */
  iconPosition?: 'left' | 'right';
  /** Button content */
  children: ReactNode;
  /** Translation key for i18n (optional, overrides children if provided) */
  textKey?: string;
  /** Translation namespace (optional, defaults to 'ui.button') */
  namespace?: string;
}

/**
 * Variant configurations
 */
const VARIANT_CONFIG: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg focus:ring-blue-500',
  secondary: 'bg-zinc-600 hover:bg-zinc-700 text-white shadow-md hover:shadow-lg focus:ring-zinc-500',
  outline: 'border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 focus:ring-blue-500',
  ghost: 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-zinc-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg focus:ring-red-500',
  link: 'text-blue-600 dark:text-blue-400 hover:underline focus:ring-blue-500',
};

/**
 * Size configurations
 */
const SIZE_CONFIG: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
};

/**
 * Loading spinner component
 */
const LoadingSpinner: FC = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
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

/**
 * Main Button component with i18n support
 */
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className,
  children,
  textKey,
  namespace = 'ui.button',
  ...props
}) => {
  const isDisabled = disabled || loading;
  const t = useTranslations(namespace);
  const tLoading = useTranslations('loading');

  // Use translation if textKey is provided, otherwise use children
  const displayText = textKey ? t(textKey as any) : children;
  const loadingText = tLoading('default');

  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-medium rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',

        // Variant styles
        VARIANT_CONFIG[variant],

        // Size styles
        SIZE_CONFIG[size],

        // Full width
        fullWidth && 'w-full',

        // Custom classes
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      {typeof displayText === 'string' ? (
        <span>{loading ? loadingText : displayText}</span>
      ) : (
        displayText
      )}
      {icon && iconPosition === 'right' && !loading && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

/**
 * Button Group - For grouping related buttons together
 */
export interface ButtonGroupProps {
  /** Buttons to group */
  children: ReactNode;
  /** Additional class name */
  className?: string;
}

export const ButtonGroup: FC<ButtonGroupProps> = ({ children, className }) => (
  <div className={cn('flex gap-2 flex-wrap', className)}>
    {children}
  </div>
);

/**
 * IconButton - For buttons with only icons
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** Icon element */
  icon: ReactNode;
  /** Tooltip text */
  tooltip?: string;
}

export const IconButton: FC<IconButtonProps> = ({
  icon,
  tooltip,
  size = 'md',
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900',
        'transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        VARIANT_CONFIG.ghost,
        SIZE_CONFIG[size],
        className
      )}
      title={tooltip}
      {...props}
    >
      {icon}
    </button>
  );
};

export default Button;
