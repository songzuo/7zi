'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 联系页面错误边界
 */
export default function ContactError({
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
      title="联系我们页面加载失败"
    />
  );
}
