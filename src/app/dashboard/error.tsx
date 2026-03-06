'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Dashboard 页面错误边界
 */
export default function DashboardError({
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
      title="控制面板加载失败"
    />
  );
}
