'use client';

import React, { forwardRef, useId, InputHTMLAttributes, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type InputSize = 'sm' | 'md' | 'lg' | 'xl';
export type InputVariant = 'default' | 'filled' | 'flushed';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: InputSize;
  /** Input variant */
  variant?: InputVariant;
  /** Label text */
  label?: string;
  /** Helper text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Required field */
  required?: boolean;
  /** Icon on the left */
  leftIcon?: ReactNode;
  /** Icon or element on the right */
  rightIcon?: ReactNode;
  /** Full width */
  fullWidth?: boolean;
  /** Additional class name */
  className?: string;
  /** Container class name */
  containerClassName?: string;
}

// ============================================
// STYLES
// ============================================

const sizeStyles: Record<InputSize, { input: string; label: string }> = {
  sm: {
    input: 'px-3 py-1.5 text-sm rounded-md',
    label: 'text-xs mb-1',
  },
  md: {
    input: 'px-4 py-2 text-sm rounded-lg',
    label: 'text-sm mb-1.5',
  },
  lg: {
    input: 'px-4 py-3 text-base rounded-xl',
    label: 'text-sm mb-2',
  },
  xl: {
    input: 'px-6 py-4 text-lg rounded-2xl',
    label: 'text-base mb-2',
  },
};

const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-white dark:bg-zinc-800 
    border border-zinc-200 dark:border-zinc-700 
    focus:border-cyan-500 dark:focus:border-cyan-400
  `,
  filled: `
    bg-zinc-100 dark:bg-zinc-800 
    border border-transparent 
    focus:bg-white dark:focus:bg-zinc-900 focus:border-cyan-500
  `,
  flushed: `
    bg-transparent 
    border-b-2 border-zinc-200 dark:border-zinc-700 
    rounded-none
    focus:border-cyan-500 dark:focus:border-cyan-400
  `,
};

const baseStyles = `
  w-full 
  text-zinc-900 dark:text-white 
  placeholder-zinc-400 dark:placeholder-zinc-500
  focus:outline-none focus:ring-2 focus:ring-cyan-500/20
  transition-all duration-200
`;

// ============================================
// COMPONENT
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label,
      hint,
      error,
      success,
      required = false,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      containerClassName = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    
    // Determine border color based on state
    let borderColorClass = '';
    if (error) {
      borderColorClass = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
    } else if (success) {
      borderColorClass = 'border-green-500 focus:border-green-500 focus:ring-green-500/20';
    }

    // Determine text color for hint/error
    const hintTextClass = error
      ? 'text-red-500 dark:text-red-400'
      : success
      ? 'text-green-500 dark:text-green-400'
      : 'text-zinc-500 dark:text-zinc-400';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`
              block font-medium text-zinc-700 dark:text-zinc-300
              ${sizeStyles[size].label}
            `.replace(/\s+/g, ' ').trim()}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              ${baseStyles}
              ${variantStyles[variant]}
              ${sizeStyles[size].input}
              ${borderColorClass}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : ''}
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            aria-invalid={!!error}
            aria-describedby={error || hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Hint / Error */}
        {(error || hint) && (
          <p
            id={`${inputId}-hint`}
            className={`mt-1.5 text-sm ${hintTextClass}`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// TEXTAREA
// ============================================

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Textarea size */
  size?: InputSize;
  /** Textarea variant */
  variant?: InputVariant;
  /** Label text */
  label?: string;
  /** Helper text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Required field */
  required?: boolean;
  /** Auto resize */
  autoResize?: boolean;
  /** Min rows */
  minRows?: number;
  /** Max rows */
  maxRows?: number;
  /** Full width */
  fullWidth?: boolean;
  /** Additional class name */
  className?: string;
  /** Container class name */
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label,
      hint,
      error,
      success,
      required = false,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      fullWidth = true,
      className = '',
      containerClassName = '',
      disabled,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    
    // Determine border color for textarea
    let borderColorClass = '';
    if (error) {
      borderColorClass = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
    } else if (success) {
      borderColorClass = 'border-green-500 focus:border-green-500 focus:ring-green-500/20';
    }

    // Determine text color for hint/error
    const hintTextClass = error
      ? 'text-red-500 dark:text-red-400'
      : success
      ? 'text-green-500 dark:text-green-400'
      : 'text-zinc-500 dark:text-zinc-400';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`
              block font-medium text-zinc-700 dark:text-zinc-300
              ${sizeStyles[size].label}
            `.replace(/\s+/g, ' ').trim()}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          rows={rows}
          className={`
            ${baseStyles}
            ${variantStyles[variant]}
            ${sizeStyles[size].input}
            ${borderColorClass}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : ''}
            ${autoResize ? 'resize-none' : 'resize-y'}
            ${className}
          `.replace(/\s+/g, ' ').trim()}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {/* Hint / Error */}
        {(error || hint) && (
          <p
            id={`${inputId}-hint`}
            className={`mt-1.5 text-sm ${hintTextClass}`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ============================================
// SELECT
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Select size */
  size?: InputSize;
  /** Select variant */
  variant?: InputVariant;
  /** Label text */
  label?: string;
  /** Helper text */
  hint?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Required field */
  required?: boolean;
  /** Options */
  options: SelectOption[];
  /** Placeholder */
  placeholder?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Additional class name */
  className?: string;
  /** Container class name */
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label,
      hint,
      error,
      success,
      required = false,
      options,
      placeholder,
      fullWidth = true,
      className = '',
      containerClassName = '',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    
    // Determine border color for select
    let borderColorClass = '';
    if (error) {
      borderColorClass = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
    } else if (success) {
      borderColorClass = 'border-green-500 focus:border-green-500 focus:ring-green-500/20';
    }

    // Determine text color for hint/error
    const hintTextClass = error
      ? 'text-red-500 dark:text-red-400'
      : success
      ? 'text-green-500 dark:text-green-400'
      : 'text-zinc-500 dark:text-zinc-400';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={`
              block font-medium text-zinc-700 dark:text-zinc-300
              ${sizeStyles[size].label}
            `.replace(/\s+/g, ' ').trim()}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              ${baseStyles}
              ${variantStyles[variant]}
              ${sizeStyles[size].input}
              ${borderColorClass}
              appearance-none cursor-pointer pr-10
              ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : ''}
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            aria-invalid={!!error}
            aria-describedby={error || hint ? `${inputId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Hint / Error */}
        {(error || hint) && (
          <p
            id={`${inputId}-hint`}
            className={`mt-1.5 text-sm ${hintTextClass}`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ============================================
// DEFAULT EXPORT
// ============================================

export default Input;