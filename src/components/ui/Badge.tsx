'use client'
import { HTMLAttributes } from 'react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'destructive' | 'outline'
}

const variantStyles = {
  default: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  destructive: 'bg-red-600 dark:bg-red-700 text-white',
  outline:
    'bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200',
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
