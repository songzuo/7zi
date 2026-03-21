'use client';

import { useEffect, useCallback, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorDisplay, ErrorType } from './ErrorDisplay';
import { getErrorCode, ErrorCodes, isNetworkError } from '@/lib/errors';

export interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  showReset?: boolean;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  showCopyError?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
}

/**
 * 分析错误类型
 */
function analyzeErrorType(error: Error): ErrorType {
  // 网络错误
  if (isNetworkError(error)) {
    return 'network';
  }

  const code = getErrorCode(error);
  
  switch (code) {
    case ErrorCodes.NOT_FOUND:
      return 'not-found';
    case ErrorCodes.UNAUTHORIZED:
      return 'unauthorized';
    case ErrorCodes.FORBIDDEN:
      return 'forbidden';
    case ErrorCodes.SERVER_ERROR:
      return 'server';
    case ErrorCodes.NETWORK_ERROR:
      return 'network';
    default:
      return 'generic';
  }
}

/**
 * 根据错误类型获取友好的标题
 */
function getErrorTitle(errorType: ErrorType, defaultTitle: string): string {
  switch (errorType) {
    case 'network':
      return '网络连接失败';
    case 'not-found':
      return '页面不存在';
    case 'unauthorized':
      return '需要登录';
    case 'forbidden':
      return '没有权限';
    case 'server':
      return '服务器错误';
    default:
      return defaultTitle;
  }
}

/**
 * 根据错误类型获取友好的消息
 */
function getErrorMessage(errorType: ErrorType, defaultMessage: string): string {
  switch (errorType) {
    case 'network':
      return '请检查您的网络连接，然后重试';
    case 'not-found':
      return '您访问的页面不存在或已被移除';
    case 'unauthorized':
      return '请登录后继续访问此页面';
    case 'forbidden':
      return '您没有权限访问此页面';
    case 'server':
      return '服务器暂时无法处理请求，请稍后重试';
    default:
      return defaultMessage;
  }
}

/**
 * 错误边界组件 - 用于 Next.js 页面级错误处理
 * 配合 error.tsx 使用，自动捕获路由级别的错误
 * 
 * 特性：
 * - 自动分析错误类型
 * - 智能显示友好的错误消息
 * - 提供多种恢复选项
 * - 集成 Sentry 错误监控
 * - 支持重试计数和自动恢复
 */
export function ErrorBoundary({
  error,
  reset,
  title = '出现了一些问题',
  showReset = true,
  showHomeButton = true,
  showBackButton = true,
  showRefreshButton = true,
  showCopyError = true,
  variant = 'default',
}: ErrorBoundaryProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [hasRecovered, setHasRecovered] = useState(false);

  const errorType = analyzeErrorType(error);
  const displayTitle = getErrorTitle(errorType, title);
  const defaultMessage = error.message || '发生了意外错误，请稍后重试';
  const displayMessage = getErrorMessage(errorType, defaultMessage);

  // 错误上报
  useEffect(() => {
    // 避免重复上报相同的错误
    if (hasRecovered) return;

    // 记录错误到 Sentry
    Sentry.withScope((scope) => {
      scope.setTag('error_type', errorType);
      scope.setTag('retry_count', retryCount);
      scope.setExtra('digest', error.digest);
      scope.setExtra('url', typeof window !== 'undefined' ? window.location.href : '');
      Sentry.captureException(error);
    });

    // 开发环境同时输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Error Boundary 捕获到错误');
      console.error('错误类型:', errorType);
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      if (error.digest) {
        console.error('错误摘要:', error.digest);
      }
      console.error('重试次数:', retryCount);
    }
  }, [error, errorType, retryCount, hasRecovered]);

  // 智能重试处理
  const handleReset = useCallback(async () => {
    setRetryCount((prev) => prev + 1);
    
    try {
      await reset();
      setHasRecovered(true);
    } catch (e) {
      // 重试失败，错误会被 ErrorBoundary 重新捕获
      if (process.env.NODE_ENV === 'development') {
        console.error('重试失败:', e);
      }
    }
  }, [reset]);

  // 返回首页
  const handleGoHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  // 返回上一页
  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  }, [handleGoHome]);

  // 刷新页面（备用功能，未来可能使用）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <ErrorDisplay
      title={displayTitle}
      message={displayMessage}
      showReset={showReset}
      onReset={handleReset}
      errorDigest={error.digest}
      variant={variant}
      errorType={errorType}
      showHomeButton={showHomeButton}
      showBackButton={showBackButton}
      showRefreshButton={showRefreshButton}
      showCopyError={showCopyError}
      onGoHome={handleGoHome}
      onGoBack={handleGoBack}
    />
  );
}

export default ErrorBoundary;