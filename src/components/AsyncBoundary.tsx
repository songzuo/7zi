'use client';

import { useState, useCallback } from 'react';
import { ErrorBoundaryWrapper } from './ErrorBoundaryWrapper';
import type { ReactNode } from 'react';

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 自动重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否在错误时自动重试 */
  autoRetry?: boolean;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

interface AsyncBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 异步错误边界组件
 * 专门用于处理异步操作（如数据获取、懒加载）中的错误
 * 
 * 特性：
 * - 支持自动重试
 * - 支持最大重试次数限制
 * - 支持自定义加载状态
 * - 支持错误回调
 */
export function AsyncBoundary({
  children,
  fallback,
  maxRetries = 3,
  retryDelay = 1000,
  autoRetry = false,
  onError,
}: AsyncBoundaryProps) {
  const [state, setState] = useState<AsyncBoundaryState>({
    hasError: false,
    error: null,
    retryCount: 0,
  });

  const handleError = useCallback((error: Error) => {
    onError?.(error);
    
    setState((prev) => {
      const newRetryCount = prev.retryCount + 1;
      
      // 自动重试逻辑
      if (autoRetry && newRetryCount < maxRetries) {
        setTimeout(() => {
          setState((s) => ({ ...s, hasError: false, error: null }));
        }, retryDelay);
      }
      
      return {
        hasError: true,
        error,
        retryCount: newRetryCount,
      };
    });
  }, [autoRetry, maxRetries, retryDelay, onError]);

  return (
    <ErrorBoundaryWrapper
      fallback={fallback}
      onError={(error) => handleError(error)}
      showReset={state.retryCount < maxRetries}
      title="数据加载失败"
    >
      {children}
    </ErrorBoundaryWrapper>
  );
}

/**
 * 用于包装 React.lazy 组件的便捷函数
 */
export function withAsyncBoundary<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  options: Omit<AsyncBoundaryProps, 'children'> = {},
) {
  return function WithAsyncBoundaryWrapper(props: P) {
    return (
      <AsyncBoundary {...options}>
        <LazyComponent {...props} />
      </AsyncBoundary>
    );
  };
}

export default AsyncBoundary;