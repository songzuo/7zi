'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export { createPageErrorBoundary as default } from '@/components/errors';

export function createPageErrorBoundary(title: string) {
  return function PortfolioError({
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
        title={title || '作品案例加载失败'}
      />
    );
  };
}
