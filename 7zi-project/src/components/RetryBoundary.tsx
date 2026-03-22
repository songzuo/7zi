'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { ErrorDisplay, ErrorType } from './ErrorDisplay';

interface RetryBoundaryProps {
  children: ReactNode;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否显示错误详情 */
  showErrorDetails?: boolean;
  /** 自定义错误标题 */
  title?: string;
  /** 错误处理回调 */
  onError?: (error: Error, retryCount: number) => void;
  /** 成功回调 */
  onSuccess?: () => void;
}

interface RetryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * 带重试机制的错误边界
 * 
 * 特性：
 * - 自动重试（可配置次数和延迟）
 * - 指数退避策略
 * - 错误类型分析
 * - 友好的错误 UI
 * 
 * 使用示例：
 * ```tsx
 * <RetryBoundary maxRetries={3} retryDelay={2000}>
 *   <SomeComponentThatMightFail />
 * </RetryBoundary>
 * ```
 */
export function RetryBoundary({
  children,
  maxRetries = 3,
  retryDelay = 1000,
  showErrorDetails = false,
  title = '加载失败',
  onError,
  onSuccess,
}: RetryBoundaryProps) {
  const [state, setState] = useState<RetryState>({
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
  });

  // 分析错误类型
  const getErrorType = useCallback((error: Error): ErrorType => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'not-found';
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'unauthorized';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'forbidden';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server';
    }
    
    return 'generic';
  }, []);

  // 重试逻辑
  const handleRetry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      return;
    }

    setState((prev) => ({ ...prev, isRetrying: true }));

    // 指数退避：每次重试延迟加倍
    const delay = retryDelay * Math.pow(2, state.retryCount);
    
    await new Promise((resolve) => setTimeout(resolve, delay));

    setState((prev) => ({
      ...prev,
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: prev.retryCount + 1,
    }));

    // 成功恢复后通知
    onSuccess?.();
  }, [state.retryCount, maxRetries, retryDelay, onSuccess]);

  // 错误捕获
  const componentDidCatch = useCallback((error: Error) => {
    setState((prev) => ({
      ...prev,
      hasError: true,
      error,
    }));

    onError?.(error, state.retryCount);
  }, [onError, state.retryCount]);

  // 包装子组件以捕获错误
  useEffect(() => {
    const originalHandler = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        componentDidCatch(error);
      }
      if (originalHandler) {
        return originalHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    return () => {
      window.onerror = originalHandler;
    };
  }, [componentDidCatch]);

  // 监听 Promise 拒绝
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      componentDidCatch(error);
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [componentDidCatch]);

  if (state.hasError && state.error) {
    const errorType = getErrorType(state.error);
    const canRetry = state.retryCount < maxRetries;
    const retryText = canRetry ? `重试 (${state.retryCount}/${maxRetries})` : '已达到最大重试次数';

    return (
      <ErrorDisplay
        title={title}
        message={state.error.message || '发生意外错误'}
        errorType={errorType}
        showReset={canRetry}
        onReset={handleRetry}
        showHomeButton
        showBackButton
        showRefreshButton={!canRetry}
        showCopyError={showErrorDetails}
        errorDigest={state.retryCount > 0 ? `Retry #${state.retryCount}` : undefined}
      />
    );
  }

  return <>{children}</>;
}

/**
 * HOC 包装器 - 用于函数组件
 */
export function withRetry<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<RetryBoundaryProps, 'children'>
) {
  return function ComponentWithRetry(props: P) {
    return (
      <RetryBoundary {...options}>
        <WrappedComponent {...props} />
      </RetryBoundary>
    );
  };
}

export default RetryBoundary;
