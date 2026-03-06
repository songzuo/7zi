'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 团队页面错误边界
 */
export default function TeamError({
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
      title="团队成员页面加载失败"
    />
  );
}
