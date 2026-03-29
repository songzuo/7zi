'use memo';

/**
 * Button 组件 - 按钮组件
 * 支持多种变体、大小、状态，包含增强的交互反馈
 * 
 * @version 1.1.0
 * @date 2026-03-29
 */

import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';

// ============================================
// 类型定义
// ============================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  /** 按钮大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 是否启用涟漪效果 */
  ripple?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}

// ============================================
// 涟漪效果组件
// ============================================

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

// ============================================
// Button 组件
// ============================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      fullWidth = false,
      ripple = true,
      children,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<RippleProps[]>([]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const rippleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 清理涟漪效果
    const cleanupRipples = useCallback(() => {
      if (rippleTimeoutRef.current) {
        clearTimeout(rippleTimeoutRef.current);
      }
      rippleTimeoutRef.current = setTimeout(() => {
        setRipples([]);
      }, 600);
    }, []);

    // 创建涟漪效果
    const createRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current || (ref as React.RefObject<HTMLButtonElement>)?.current;
      if (!button || !ripple) return;

      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      setRipples(prev => [...prev, { x, y, size }]);
      cleanupRipples();
    }, [ripple, ref, cleanupRipples]);

    // 处理点击
    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault();
        return;
      }

      createRipple(event);
      onClick?.(event);
    }, [loading, disabled, createRipple, onClick]);

    // 基础样式
    const baseStyles = clsx(
      'relative overflow-hidden',
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-[0.98]',
      'transform-gpu'
    );

    // 变体样式 - 增强 hover 效果
    const variantStyles = {
      primary: clsx(
        'bg-blue-600 text-white',
        'hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25',
        'focus:ring-blue-500',
        'shadow-sm'
      ),
      secondary: clsx(
        'bg-gray-600 text-white',
        'hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-500/25',
        'focus:ring-gray-500',
        'shadow-sm'
      ),
      outline: clsx(
        'border-2 border-blue-600 text-blue-600',
        'hover:bg-blue-50 hover:border-blue-700 hover:shadow-md',
        'focus:ring-blue-500',
        'dark:hover:bg-blue-900/20'
      ),
      ghost: clsx(
        'text-gray-700',
        'hover:bg-gray-100 hover:shadow-sm',
        'focus:ring-gray-500',
        'dark:text-gray-300 dark:hover:bg-gray-800'
      ),
      danger: clsx(
        'bg-red-600 text-white',
        'hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25',
        'focus:ring-red-500',
        'shadow-sm'
      ),
      success: clsx(
        'bg-green-600 text-white',
        'hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/25',
        'focus:ring-green-500',
        'shadow-sm'
      ),
    };

    // 尺寸样式
    const sizeStyles = {
      xs: 'px-2.5 py-1 text-xs gap-1',
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2',
      xl: 'px-6 py-3 text-lg gap-2.5',
    };

    // 组合样式类
    const classes = clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && 'w-full',
      loading && 'opacity-75 cursor-wait',
      className
    );

    return (
      <button
        ref={ref || buttonRef}
        className={classes}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* 涟漪效果层 */}
        {ripple && !disabled && !loading && (
          <span className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
            {ripples.map((r, index) => (
              <span
                key={index}
                className="absolute animate-ripple bg-white/30 rounded-full"
                style={{
                  left: r.x - r.size / 2,
                  top: r.y - r.size / 2,
                  width: r.size,
                  height: r.size,
                }}
              />
            ))}
          </span>
        )}

        {/* 加载状态 */}
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        )}

        {/* 内容 */}
        <span className="relative z-10 flex items-center justify-center gap-inherit">
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// 图标按钮组件
// ============================================

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  /** 图标 */
  icon: React.ReactNode;
  /** aria-label */
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className, ...props }, ref) => {
    const sizeStyles = {
      xs: 'p-1',
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-2.5',
      xl: 'p-3',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={clsx(sizeStyles[size], className)}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================
// 按钮组组件
// ============================================

export interface ButtonGroupProps {
  /** 子按钮 */
  children: React.ReactNode;
  /** 方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 间距 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  /** CSS 类名 */
  className?: string;
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  gap = 'sm',
  className,
}: ButtonGroupProps) {
  const gapStyles = {
    none: 'gap-0',
    sm: 'gap-1',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div
      className={clsx(
        'flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        gapStyles[gap],
        className
      )}
      role="group"
    >
      {children}
    </div>
  );
}

export default Button;
