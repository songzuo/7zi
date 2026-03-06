'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 博客文章详情页面错误边界
 */
export default function BlogSlugError({
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
      title="文章加载失败"
    />
  );
}
