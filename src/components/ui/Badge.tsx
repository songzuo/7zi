'use client';

import React, { HTMLAttributes, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type BadgeVariant = 'default' | 'status' | 'priority' | 'type' | 'success' | 'error' | 'warning' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Badge color (for custom variant) */
  color?: string;
  /** Show dot indicator */
  dot?: boolean;
  /** Dot color override */
  dotColor?: string;
  /** Outline style */
  outline?: boolean;
  /** Additional class name */
  className?: string;
  /** Children */
  children: ReactNode;
}

// ============================================
// STATUS CONFIG
// ============================================

export const STATUS_CONFIG = {
  pending: { label: '待处理', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-200' },
  assigned: { label: '已分配', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-200' },
  in_progress: { label: '进行中', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-200' },
  completed: { label: '已完成', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-200' },
  cancelled: { label: '已取消', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-200' },
} as const;

// ============================================
// PRIORITY CONFIG
// ============================================

export const PRIORITY_CONFIG = {
  urgent: { label: '紧急', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
  high: { label: '高', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
  medium: { label: '中', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-200', dotColor: 'bg-yellow-500' },
  low: { label: '低', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
} as const;

// ============================================
// TYPE CONFIG
// ============================================

export const TYPE_CONFIG = {
  development: { label: '开发', bgColor: 'bg-blue-100', textColor: 'text-blue-800', icon: '💻' },
  design: { label: '设计', bgColor: 'bg-pink-100', textColor: 'text-pink-800', icon: '🎨' },
  research: { label: '研究', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', icon: '🔬' },
  marketing: { label: '营销', bgColor: 'bg-amber-100', textColor: 'text-amber-800', icon: '📢' },
  other: { label: '其他', bgColor: 'bg-gray-100', textColor: 'text-gray-800', icon: '📋' },
} as const;

// ============================================
// STYLES
// ============================================

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  status: '', // Will be computed from value
  priority: '', // Will be computed from value
  type: '', // Will be computed from value
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

// ============================================
// COMPONENT
// ============================================

export function Badge({
  variant = 'default',
  size = 'md',
  color,
  dot = false,
  dotColor,
  outline = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  // Get base styles
  let bgStyle = variantStyles[variant];
  
  // Custom color override
  if (color) {
    bgStyle = color;
  }

  // Outline style
  const outlineStyle = outline ? 'bg-transparent border' : '';

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full
        ${sizeStyles[size]}
        ${bgStyle}
        ${outlineStyle}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor || 'bg-current'}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

// ============================================
// STATUS BADGE
// ============================================

export type StatusValue = keyof typeof STATUS_CONFIG;

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Status value */
  value: StatusValue;
}

export function StatusBadge({ value, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[value] || STATUS_CONFIG.pending;
  
  return (
    <Badge
      variant="status"
      className={`${config.bgColor} ${config.textColor}`}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

// ============================================
// PRIORITY BADGE
// ============================================

export type PriorityValue = keyof typeof PRIORITY_CONFIG;

export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  /** Priority value */
  value: PriorityValue;
  /** Show dot indicator */
  showDot?: boolean;
}

export function PriorityBadge({ value, showDot = false, ...props }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.medium;
  
  return (
    <Badge
      variant="priority"
      dot={showDot}
      dotColor={config.dotColor}
      className={`${config.bgColor} ${config.textColor}`}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

// ============================================
// TYPE BADGE
// ============================================

export type TypeValue = keyof typeof TYPE_CONFIG;

export interface TypeBadgeProps extends Omit<BadgeProps, 'variant'> {
  /** Type value */
  value: TypeValue;
  /** Show icon */
  showIcon?: boolean;
}

export function TypeBadge({ value, showIcon = false, ...props }: TypeBadgeProps) {
  const config = TYPE_CONFIG[value] || TYPE_CONFIG.other;
  
  return (
    <Badge
      variant="type"
      className={`${config.bgColor} ${config.textColor}`}
      {...props}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}

// ============================================
// DOT BADGE
// ============================================

export interface DotBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  /** Badge content */
  content?: string | number;
  /** Badge color */
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Pulse animation */
  pulse?: boolean;
}

const dotColorStyles = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  purple: 'bg-purple-500 text-white',
};

const dotSizeStyles = {
  sm: 'min-w-[16px] h-4 text-[10px]',
  md: 'min-w-[20px] h-5 text-xs',
  lg: 'min-w-[24px] h-6 text-sm',
};

export function DotBadge({
  content,
  color = 'red',
  size = 'md',
  pulse = false,
  className = '',
  ...props
}: DotBadgeProps) {
  if (!content) {
    return (
      <span
        className={`
          inline-block w-2 h-2 rounded-full
          ${dotColorStyles[color].split(' ')[0]}
          ${pulse ? 'animate-pulse' : ''}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      />
    );
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium px-1
        ${dotColorStyles[color]}
        ${dotSizeStyles[size]}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {content}
    </span>
  );
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default Badge;