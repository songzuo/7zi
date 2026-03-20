'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  return (
    <html>
      <body>
        <ErrorBoundary
          error={error}
          reset={reset}
          title="应用程序错误"
          variant="fullscreen"
          showReset={true}
          showHomeButton={true}
          showBackButton={false}
          showRefreshButton={true}
          showCopyError={true}
        />
      </body>
    </html>
  );
}
