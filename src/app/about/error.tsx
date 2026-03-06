'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 关于页面错误边界
 */
export default function AboutError({
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
      title="关于我们页面加载失败"
    />
  );
}
