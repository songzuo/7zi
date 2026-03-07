'use client';

import { memo, useCallback, useEffect, useState, useMemo } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  striped?: boolean;
}

// ============================================================================
// 常量配置 - 移到模块级别避免每次渲染重新创建
// ============================================================================

const SIZE_CLASSES = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
} as const;

const COLOR_CLASSES = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
} as const;

// ============================================================================
// 进度条组件 - 性能优化版本
// ============================================================================

/**
 * ProgressBar 组件
 * 
 * 性能优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useCallback 缓存事件处理
 * 3. 常量配置外部化
 */
const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = 'blue',
  size = 'md',
  animated = true,
  striped = false,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );

  useEffect(() => {
    if (animated) {
      const duration = 500;
      const steps = 20;
      const increment = (percentage - displayValue) / steps;
      let current = displayValue;
      const timer = setInterval(() => {
        current += increment;
        if (
          (increment > 0 && current >= percentage) ||
          (increment < 0 && current <= percentage)
        ) {
          setDisplayValue(percentage);
          clearInterval(timer);
        } else {
          setDisplayValue(current);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayValue(percentage);
    }
  }, [percentage, animated]);

  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];
  const stripedClass = striped ? 'bg-stripes' : '';
  const barStyle = useMemo(
    () => ({ width: `${displayValue}%` }),
    [displayValue]
  );

  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClass}`}>
        <div
          className={`${sizeClass} ${colorClass} ${stripedClass} rounded-full transition-all duration-300 ease-out`}
          style={barStyle}
        />
      </div>
    </div>
  );
});

// ============================================================================
// 环形进度条组件 - 性能优化版本
// ============================================================================

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  showValue?: boolean;
  label?: string;
}

const COLOR_MAP = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#8b5cf6',
} as const;

/**
 * CircularProgress 组件
 * 
 * 性能优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useMemo 缓存计算结果
 */
export const CircularProgress = memo(function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'blue',
  showValue = true,
  label,
}: CircularProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = useMemo(
    () => Math.min(Math.max((value / max) * 100, 0), 100),
    [value, max]
  );

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = useMemo(
    () => circumference - (displayValue / 100) * circumference,
    [circumference, displayValue]
  );

  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const increment = (percentage - displayValue) / steps;
    let current = displayValue;
    const timer = setInterval(() => {
      current += increment;
      if (
        (increment > 0 && current >= percentage) ||
        (increment < 0 && current <= percentage)
      ) {
        setDisplayValue(percentage);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage]);

  const strokeColor = COLOR_MAP[color];
  const containerStyle = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <div className="relative inline-flex items-center justify-center" style={containerStyle}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(displayValue)}%
          </span>
          {label && (
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 多段进度条组件 - 性能优化版本
// ============================================================================

interface MultiProgressSegment {
  value: number;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  label?: string;
}

interface MultiProgressBarProps {
  segments: MultiProgressSegment[];
  size?: 'sm' | 'md' | 'lg';
}

/**
 * MultiProgressBar 组件
 * 
 * 性能优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useMemo 缓存计算结果
 */
export const MultiProgressBar = memo(function MultiProgressBar({
  segments,
  size = 'md',
}: MultiProgressBarProps) {
  const total = useMemo(
    () => segments.reduce((sum, seg) => sum + seg.value, 0),
    [segments]
  );

  const sizeClass = SIZE_CLASSES[size];
  const hasLabels = segments.some((s) => s.label);

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex ${sizeClass}`}>
        {segments.map((segment, index) => {
          const width = (segment.value / total) * 100;
          return (
            <div
              key={index}
              className={`${sizeClass} ${COLOR_CLASSES[segment.color]} transition-all duration-300`}
              style={{ width: `${width}%` }}
              title={segment.label || `${segment.value}`}
              role="progressbar"
              aria-valuenow={segment.value}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={segment.label}
            />
          );
        })}
      </div>
      {hasLabels && (
        <div className="flex justify-between mt-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${COLOR_CLASSES[segment.color]}`} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {segment.label}: {segment.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ProgressBar;
