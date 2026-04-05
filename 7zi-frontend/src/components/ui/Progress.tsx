/**
 * Progress Component
 * 进度条组件
 */

import React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

export function Progress({ className, value = 0, max = 100, ...props }: ProgressProps): JSX.Element {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}