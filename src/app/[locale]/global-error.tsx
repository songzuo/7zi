'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 全局错误边界 - 捕获根布局中的错误
 * 这是最高优先级的错误边界
 * 
 * 注意：global-error.js 必须包含自己的 <html> 和 <body> 标签
 * 因为当根布局发生错误时，整个应用都会被替换
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-zinc-50 dark:bg-zinc-950">
        <ErrorBoundary
          error={error}
          reset={reset}
          title="应用程序发生错误"
          variant="fullscreen"
        />
      </body>
    </html>
  );
}