/**
 * Error Boundary for Analytics Dashboard
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

// Extend Window interface to include Sentry
interface WindowWithSentry extends Window {
  Sentry?: {
    captureException(
      error: Error,
      options?: { contexts?: { react?: { componentStack: string } } }
    ): void
  }
}

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('[AnalyticsErrorBoundary] Error caught:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as WindowWithSentry).Sentry && errorInfo) {
      const sentry = (window as WindowWithSentry).Sentry
      if (sentry) {
        sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack || '',
            },
          },
        })
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-lg dark:border-red-900 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Something went wrong
              </h2>
            </div>

            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              We encountered an error while loading the analytics dashboard. Please try again or
              contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="mb-2 cursor-pointer text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300">
                  Error Details (Development Only)
                </summary>
                <div className="max-h-48 overflow-auto rounded bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <pre className="font-mono whitespace-pre-wrap">{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2 font-mono whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-200 px-4 py-2 text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for convenience
export const withAnalyticsErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <AnalyticsErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </AnalyticsErrorBoundary>
    )
  }
}
