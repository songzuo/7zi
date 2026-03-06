'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 首页错误边界
 */
export default function HomeError({
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
      title="首页加载失败"
    />
  );
}
