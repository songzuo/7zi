'use client';

import { useEffect } from 'react';
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
    // 记录错误到日志系统
    logError(error);
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

/**
 * 错误日志记录函数
 */
function logError(error: Error & { digest?: string }) {
  // 控制台日志（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Boundary 捕获到错误');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    if (error.digest) {
      console.error('错误摘要:', error.digest);
    }
    console.groupEnd();
  }

  // 生产环境发送到错误追踪服务
  if (process.env.NODE_ENV === 'production') {
    sendToErrorService(error);
  }
}

/**
 * 发送错误到远程服务
 */
async function sendToErrorService(error: Error & { digest?: string }) {
  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // 可以替换为实际的错误追踪服务
    // 例如: Sentry, LogRocket, 自建 API 等
    await fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // 静默失败，避免错误日志本身导致更多错误
    });
  } catch {
    // 静默失败
  }
}

export default ErrorBoundary;
