'use client';

import { useEffect } from 'react';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/monitoring/errors';
import { ErrorCategory, ErrorSeverity } from '@/lib/monitoring/errors';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js 13+ App Router 全局错误边界
 * 自动捕获路由级别的错误并展示友好的错误页面
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function Error({
  error,
  reset,
}: ErrorBoundaryProps) {
  useEffect(() => {
    // 记录错误到日志系统
    logger.error('Route error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });

    // 使用增强的错误追踪
    if (process.env.NODE_ENV === 'production') {
      captureError(error, {
        category: 'application' as ErrorCategory,
        severity: 'error' as ErrorSeverity,
        extra: {
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : '',
        },
      });
    }
  }, [error]);

  return (
    <ErrorDisplay
      title="出现了一些问题"
      message={error.message || '发生了意外错误，请稍后重试'}
      showReset={true}
      onReset={reset}
      errorDigest={error.digest}
      variant="fullscreen"
    />
  );
}
