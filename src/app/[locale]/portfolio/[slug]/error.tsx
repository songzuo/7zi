'use client';

export { createPageErrorBoundary as default } from '@/components/errors';

export function createPageErrorBoundary(title: string) {
  return function PortfolioSlugError({
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
        title={title || '项目详情加载失败'}
      />
    );
  };
}
