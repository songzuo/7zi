/**
 * Loading 组件 - 加载状态展示
 * 支持多种类型、尺寸、全屏模式
 * 
 * @example
 * // Spinner 类型
 * <Loading type="spinner" text="加载中..." />
 * 
 * // 全屏加载
 * <Loading type="spinner" fullscreen />
 * 
 * // 骨架屏
 * <Loading type="skeleton" />
 */

import React from 'react';
import clsx from 'clsx';

export interface LoadingProps {
  /** 加载类型 */
  type?: 'spinner' | 'dots' | 'skeleton' | 'pulse';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 加载文本 */
  text?: string;
  /** 是否全屏 */
  fullscreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  text,
  fullscreen = false,
  className,
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  // Spinner 类型 - 旋转加载图标
  if (type === 'spinner') {
    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-2',
          fullscreen && 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50',
          className
        )}
        role="status"
        aria-label={text || '加载中'}
      >
        <svg
          className={clsx('animate-spin text-blue-600 dark:text-blue-400', sizeStyles[size])}
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
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
        )}
        <span className="sr-only">{text || '加载中'}</span>
      </div>
    );
  }

  // Dots 类型 - 跳动圆点
  if (type === 'dots') {
    const dotSizes = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
    };

    return (
      <div
        className={clsx(
          'flex flex-col items-center justify-center gap-2',
          fullscreen && 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50',
          className
        )}
        role="status"
        aria-label={text || '加载中'}
      >
        <div className="flex gap-1">
          {[0, 150, 300].map((delay, index) => (
            <div
              key={index}
              className={clsx(
                'bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce',
                dotSizes[size]
              )}
              style={{ animationDelay: `${delay}ms` }}
              aria-hidden="true"
            />
          ))}
        </div>
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
        )}
        <span className="sr-only">{text || '加载中'}</span>
      </div>
    );
  }

  // Skeleton 类型 - 骨架屏
  if (type === 'skeleton') {
    return (
      <div
        className={clsx('animate-pulse space-y-4', className)}
        role="status"
        aria-label="内容加载中"
      >
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <span className="sr-only">内容加载中</span>
      </div>
    );
  }

  // Pulse 类型 - 脉冲动画
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-2',
        fullscreen && 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50',
        className
      )}
      role="status"
      aria-label={text || '加载中'}
    >
      <div
        className={clsx(
          'bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse',
          sizeStyles[size]
        )}
        aria-hidden="true"
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
      <span className="sr-only">{text || '加载中'}</span>
    </div>
  );
};

/**
 * Skeleton 组件 - 骨架屏占位符
 * 用于内容加载前的占位显示
 * 
 * @example
 * <Skeleton shape="text" width="200px" />
 * <Skeleton shape="circle" width="48px" />
 * <Skeleton shape="rect" width="100%" height="200px" />
 */
export interface SkeletonProps {
  /** 形状 */
  shape?: 'text' | 'circle' | 'rect';
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 自定义类名 */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  shape = 'text',
  width,
  height,
  className,
}) => {
  const shapeStyles = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  };

  return (
    <div
      className={clsx(
        'bg-gray-200 dark:bg-gray-700 animate-pulse',
        shapeStyles[shape],
        className
      )}
      style={{
        width: width,
        height: height || (shape === 'circle' ? width : undefined),
      }}
      role="presentation"
      aria-hidden="true"
    />
  );
};

/**
 * SkeletonCard 组件 - 卡片骨架屏
 * 预设的卡片骨架屏布局
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4', className)}>
    <Skeleton shape="rect" width="100%" height="200px" />
    <Skeleton shape="text" width="60%" />
    <Skeleton shape="text" width="100%" />
    <Skeleton shape="text" width="80%" />
    <div className="flex gap-2 pt-2">
      <Skeleton shape="rect" width="80px" height="32px" />
      <Skeleton shape="rect" width="80px" height="32px" />
    </div>
  </div>
);

/**
 * SkeletonList 组件 - 列表骨架屏
 * 预设的列表骨架屏布局
 */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({ 
  count = 3, 
  className 
}) => (
  <div className={clsx('space-y-4', className)}>
    {Array.from({ length: count }).map((_, index) => (
      <div 
        key={index} 
        className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <Skeleton shape="circle" width="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="text" width="40%" />
          <Skeleton shape="text" width="100%" />
          <Skeleton shape="text" width="80%" />
        </div>
      </div>
    ))}
  </div>
);
