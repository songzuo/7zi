'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export { createPageErrorBoundary as default } from '@/components/errors';

export function createPageErrorBoundary(title: string) {
  return function TasksError({
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
        title={title || '任务管理加载失败'}
      />
    );
  };
}
