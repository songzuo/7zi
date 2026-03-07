import React from 'react';
import { TaskPriority, PRIORITY_CONFIG } from '@/lib/tasks/types';

interface PriorityBadgeProps {
  priority: TaskPriority;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 任务优先级徽章组件
 */
export function PriorityBadge({
  priority,
  showLabel = true,
  size = 'md',
  className = '',
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const colorClasses: Record<TaskPriority, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${colorClasses[priority]} ${className}`}
      role="badge"
      aria-label={`优先级: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * 优先级选择器组件
 */
interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
  className?: string;
}

export function PrioritySelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: PrioritySelectorProps) {
  const priorities: TaskPriority[] = ['high', 'medium', 'low'];

  return (
    <div className={`flex gap-2 ${className}`} role="radiogroup" aria-label="选择优先级">
      {priorities.map((priority) => {
        const config = PRIORITY_CONFIG[priority];
        const isSelected = value === priority;

        return (
          <button
            key={priority}
            type="button"
            onClick={() => onChange(priority)}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-lg border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isSelected
                  ? 'border-current bg-current/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
            role="radio"
            aria-checked={isSelected}
            aria-label={config.label}
          >
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">{config.icon}</span>
              <span className={isSelected ? 'font-semibold' : ''}>{config.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}