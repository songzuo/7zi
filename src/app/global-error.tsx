'use client';

import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';

/**
 * Global Error Boundary
 * 捕获整个应用程序中的未捕获错误
 * 这个组件只在根布局发生错误时显示
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#global-errorjs
 *
 * 特性：
 * - 统一的错误展示样式
 * - 自动错误类型分析
 * - Sentry 错误上报
 * - 友好的错误消息
 * - 多种恢复选项
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 错误上报到 Sentry
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // 分析错误类型
  const getErrorType = (err: Error): string => {
    const message = err.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not-found';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'unauthorized';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'forbidden';
    }
    return 'generic';
  };

  const errorType = getErrorType(error);
  const titleMap: Record<string, string> = {
    network: '网络连接失败',
    'not-found': '页面不存在',
    unauthorized: '需要登录',
    forbidden: '没有权限',
    generic: '应用程序错误',
  };

  const messageMap: Record<string, string> = {
    network: '请检查您的网络连接，然后重试',
    'not-found': '您访问的页面不存在或已被移除',
    unauthorized: '请登录后继续访问此页面',
    forbidden: '您没有权限访问此页面',
    generic: '发生了意外错误，请稍后重试',
  };

  const title = titleMap[errorType] || '应用程序错误';
  const message = messageMap[errorType] || '发生了意外错误，请稍后重试';

  const handleReset = () => {
    // 尝试恢复
    reset();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleCopyError = () => {
    const errorText = [
      `Error: ${error.message}`,
      `Digest: ${error.digest || 'N/A'}`,
      `Type: ${errorType}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Stack: ${error.stack || 'No stack trace'}`,
    ].join('\n\n');

    navigator.clipboard.writeText(errorText).then(() => {
      alert('错误信息已复制到剪贴板');
    }).catch(() => {
      console.error('复制失败');
    });
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* 错误图标 */}
            <div className="mx-auto w-16 h-16 flex items-center justify-center">
              <svg
                className="w-full h-full text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* 错误标题 */}
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>

            {/* 错误消息 */}
            <p className="text-muted-foreground">{message}</p>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleReset} variant="primary" className="flex-1">
                尝试恢复
              </Button>
              <Button onClick={handleReload} variant="outline" className="flex-1">
                刷新页面
              </Button>
              <Button onClick={handleGoHome} variant="ghost" className="flex-1">
                返回首页
              </Button>
            </div>

            {/* 错误详情 */}
            <details className="text-left bg-muted/50 rounded-lg p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2">
                错误详情
              </summary>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold">错误信息:</span>
                  <p className="font-mono mt-1">{error.message}</p>
                </div>
                {error.digest && (
                  <div>
                    <span className="font-semibold">错误摘要:</span>
                    <p className="font-mono mt-1">{error.digest}</p>
                  </div>
                )}
                <div>
                  <span className="font-semibold">错误类型:</span>
                  <p className="mt-1">{errorType}</p>
                </div>
                <Button
                  onClick={handleCopyError}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  复制错误信息
                </Button>
              </div>
            </details>
          </div>
        </div>
      </body>
    </html>
  );
}

// 导入 React 以使用 useEffect
import React from 'react';
