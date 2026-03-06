'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorDisplay } from './ErrorDisplay';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  showReset?: boolean;
}

/**
 * 错误边界组件 - 用于 Next.js 页面级错误处理
 * 配合 error.tsx 使用，自动捕获路由级别的错误
 */
export function ErrorBoundary({
  error,
  reset,
  title = '出现了一些问题',
  showReset = true,
}: ErrorBoundaryProps) {
  useEffect(() => {
    // 记录错误到 Sentry
    Sentry.captureException(error);

    // 开发环境同时输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary 捕获到错误');
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      if (error.digest) {
        console.error('错误摘要:', error.digest);
      }
      console.groupEnd();
    }
  }, [error]);

  return (
    <ErrorDisplay
      title={title}
      message={error.message || '发生了意外错误，请稍后重试'}
      showReset={showReset}
      onReset={reset}
      errorDigest={error.digest}
    />
  );
}

export default ErrorBoundary;