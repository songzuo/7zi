'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * 骨架屏组件 - 提供加载时的占位效果
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : variant === 'circular' ? '40px' : '100px'),
  };

  return (
    <div
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  );
};

// ============================================================================
// 预设骨架屏变体
// ============================================================================

interface SkeletonCardProps {
  lines?: number;
}

/**
 * 卡片骨架屏 - 用于卡片占位
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => {
  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={`${100 - i * 15}%`} height={14} />
      ))}
    </div>
  );
};

/**
 * 头像骨架屏
 */
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizes = { sm: 32, md: 48, lg: 64 };
  return <Skeleton variant="circular" width={sizes[size]} height={sizes[size]} />;
};

/**
 * 文本行骨架屏
 */
export const SkeletonText: React.FC<{ lines?: number; gap?: number }> = ({
  lines = 3,
  gap = 8,
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '70%' : '100%'} height={14} />
      ))}
    </div>
  );
};

/**
 * 表格骨架屏
 */
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="space-y-3">
      {/* 表头 */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width={`${100 / columns}%`} height={40} />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 统计卡片骨架屏
 */
export const SkeletonStatCard: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <Skeleton variant="text" width="50%" height={12} />
      <Skeleton variant="text" width="30%" height={32} className="mt-2" />
    </div>
  );
};

export default Skeleton;
