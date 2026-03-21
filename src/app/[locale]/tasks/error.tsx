'use client';

export { createPageErrorBoundary as default } from '@/components/errors';

export function createPageErrorBoundary(title: string) {
  return function TasksError({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    const { ErrorBoundary } = require('@/components/ErrorBoundary');
    return (
      <ErrorBoundary
        error={error}
        reset={reset}
        title={title || '任务管理加载失败'}
      />
    );
  };
}
