'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 博客列表页面错误边界
 */
export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="博客页面加载失败"
    />
  );
}
