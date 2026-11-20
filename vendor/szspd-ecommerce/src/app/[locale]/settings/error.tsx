'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'

export { createPageErrorBoundary as default } from '@/components/errors'

export function createPageErrorBoundary(title: string) {
  return function SettingsError({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    return <ErrorBoundary error={error} reset={reset} title={title || '设置页面加载失败'} />
  }
}
