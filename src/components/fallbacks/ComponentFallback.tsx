/**
 * Generic Component Fallback
 *
 * Provides fallback UIs for failed component loads
 */

'use client'

import React from 'react'

export type FallbackVariant = 'skeleton' | 'error' | 'compact' | 'inline'

export interface ComponentFallbackProps {
  /** Fallback variant */
  variant?: FallbackVariant
  /** Error message */
  message?: string
  /** Custom fallback component */
  fallback?: React.ReactNode
  /** Show retry button */
  showRetry?: boolean
  /** Retry handler */
  onRetry?: () => void
  /** Show loading indicator */
  showLoading?: boolean
  /** Loading text */
  loadingText?: string
  /** Error */
  error?: Error
  /** Custom className */
  className?: string
  /** Children to render */
  children?: React.ReactNode
}

/**
 * Skeleton fallback for loading state
 */
function SkeletonFallback({
  loadingText,
  className,
}: {
  loadingText?: string
  className?: string
}) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
      {loadingText && (
        <p className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">{loadingText}</p>
      )}
    </div>
  )
}

/**
 * Error fallback with retry button
 */
function ErrorFallback({
  message = '加载失败',
  showRetry,
  onRetry,
  error,
  className,
}: {
  message?: string
  showRetry?: boolean
  onRetry?: () => void
  error?: Error
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20 ${className}`}
    >
      {/* Error icon */}
      <svg
        className="mb-4 h-12 w-12 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      {/* Error message */}
      <p className="mb-2 font-medium text-red-700 dark:text-red-300">{message}</p>

      {/* Error details (development only) */}
      {error && process.env.NODE_ENV === 'development' && (
        <details className="mt-4 w-full text-left">
          <summary className="mb-2 cursor-pointer text-sm text-red-600 dark:text-red-400">
            错误详情
          </summary>
          <div className="max-h-32 overflow-auto rounded bg-red-100 p-3 font-mono text-xs dark:bg-red-900/40">
            <div>{error.message}</div>
            {error.stack && <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>}
          </div>
        </details>
      )}

      {/* Retry button */}
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
        >
          重试
        </button>
      )}
    </div>
  )
}

/**
 * Compact error fallback (inline)
 */
function CompactErrorFallback({
  message = '加载失败',
  showRetry,
  onRetry,
  className,
}: {
  message?: string
  showRetry?: boolean
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 ${className}`}
    >
      <svg
        className="h-5 w-5 flex-shrink-0 text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</span>
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
        >
          重试
        </button>
      )}
    </div>
  )
}

/**
 * Generic component fallback with multiple variants
 */
export function ComponentFallback({
  variant = 'skeleton',
  message,
  fallback,
  showRetry,
  onRetry,
  showLoading,
  loadingText = '加载中...',
  error,
  className,
}: ComponentFallbackProps) {
  // Custom fallback
  if (fallback) {
    return <>{fallback}</>
  }

  // Loading state
  if (showLoading) {
    return <SkeletonFallback loadingText={loadingText} className={className} />
  }

  // Error state
  if (error) {
    switch (variant) {
      case 'skeleton':
        return <SkeletonFallback loadingText={message} className={className} />
      case 'compact':
        return (
          <CompactErrorFallback
            message={message}
            showRetry={showRetry}
            onRetry={onRetry}
            className={className}
          />
        )
      case 'inline':
        return (
          <CompactErrorFallback
            message={message}
            showRetry={showRetry}
            onRetry={onRetry}
            className={className}
          />
        )
      case 'error':
      default:
        return (
          <ErrorFallback
            message={message}
            showRetry={showRetry}
            onRetry={onRetry}
            error={error}
            className={className}
          />
        )
    }
  }

  // Default loading state
  return <SkeletonFallback loadingText={loadingText} className={className} />
}

/**
 * HOC to wrap components with fallback
 */
export function withFallback<P extends object>(
  Component: React.ComponentType<P>,
  fallbackProps?: Omit<ComponentFallbackProps, 'error' | 'showLoading'>
): React.FC<P & { fallback?: ComponentFallbackProps }> {
  const WrappedComponent = React.memo((props: P & { fallback?: ComponentFallbackProps }) => {
    const [error, setError] = React.useState<Error | null>(null)
    const [showLoading, setShowLoading] = React.useState(true)
    const [retryKey, setRetryKey] = React.useState(0)

    const handleRetry = React.useCallback(() => {
      setError(null)
      setShowLoading(true)
      setRetryKey(prev => prev + 1)
    }, [])

    const handleError = React.useCallback((err: Error) => {
      setError(err)
      setShowLoading(false)
    }, [])

    return (
      <ComponentFallback
        {...fallbackProps}
        {...props.fallback}
        error={error ?? undefined}
        showLoading={showLoading}
        showRetry={!!props.fallback?.showRetry || true}
        onRetry={handleRetry}
      >
        <Component
          {...(props as P)}
          key={retryKey}
          onError={handleError}
          onLoad={() => setShowLoading(false)}
        />
      </ComponentFallback>
    )
  })

  WrappedComponent.displayName = `withFallback(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ComponentFallback
