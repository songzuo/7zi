'use client';

export { createPageErrorBoundary as default } from '@/components/errors';

export function createPageErrorBoundary(title: string) {
  return function SettingsError({
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
        title={title || '设置页面加载失败'}
      />
    );
  };
}
