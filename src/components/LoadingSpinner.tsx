'use client';

import React, { memo } from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
}

/**
 * 优化的 Loading Spinner 组件
 * - 使用 React.memo 防止不必要的重渲染
 * - 添加 xl 尺寸选项
 */
const LoadingSpinnerBase: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-gray-200 border-t-blue-600`}
      role="status"
      aria-label="加载中"
    />
  );
};

// 使用 memo 导出，防止父组件更新时不必要的重渲染
export const LoadingSpinner = memo(LoadingSpinnerBase);
