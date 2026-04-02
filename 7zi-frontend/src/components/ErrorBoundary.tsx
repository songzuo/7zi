/**
 * Error Boundary Component
 *
 * React Error Boundary for catching JavaScript errors in component tree
 * Displays user-friendly error messages and provides recovery options
 *
 * Features:
 * - Catches errors in component tree
 * - Displays user-friendly error messages
 * - Provides recovery options (retry, reset)
 * - Logs errors for debugging
 * - Supports dark mode
 * - i18n support for error messages
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export interface ErrorBoundaryProps {
  /** Child components */
  children: ReactNode
  /** Fallback component to display on error */
  fallback?: ReactNode
  /** Custom error handler */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Show detailed error information (dev mode only) */
  showDetails?: boolean
  /** Additional CSS classes */
  className?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Default Fallback Component
 */
export function ErrorFallback({
  error,
  resetError,
  showDetails = false,
}: {
  error: Error | null
  resetError: () => void
  showDetails: boolean
}) {
  const { t } = useTranslation('errors')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-lg">
        {/* Error Icon */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg
              className="h-10 w-10 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('somethingWentWrong')}
          </h1>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
            {t('errorBoundary.message')}
          </p>

          {/* Error Details (dev mode only) */}
          {showDetails && error && (
            <details className="mb-6">
              <summary className="mb-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('errorBoundary.showDetails')}
              </summary>
              <div className="overflow-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
                <p className="mb-2 font-mono text-xs text-red-600 dark:text-red-400">
                  {error.name}: {error.message}
                </p>
                {error.stack && (
                  <pre className="font-mono text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-400">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetError}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              {t('errorBoundary.retry')}
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {t('errorBoundary.goHome')}
            </button>
          </div>
        </div>

        {/* Support Info */}
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-500">
          {t('errorBoundary.support')}
        </p>
      </div>
    </div>
  )
}

/**
 * Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use default fallback with a wrapper to provide reset function
      return <ErrorFallback error={error} resetError={this.resetError} showDetails={showDetails} />
    }

    return children
  }
}

/**
 * Hook for using Error Boundary in functional components
 * Note: This doesn't work directly - Error Boundaries must be class components
 * This is just a wrapper for consistency
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary
