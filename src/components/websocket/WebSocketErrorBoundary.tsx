'use client'

/**
 * WebSocket Error Boundary
 *
 * Catches and handles errors related to WebSocket connections
 * Provides fallback UI and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'

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

export class WebSocketErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('[WebSocketErrorBoundary] Caught error:', error, errorInfo)

    // Update state
    this.setState({
      error,
      errorInfo,
    })

    // Call error callback if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo)
      } catch (callbackError) {
        console.error('[WebSocketErrorBoundary] Error callback failed:', callbackError)
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/20">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <svg
              className="mx-auto h-12 w-12"
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

          <h3 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            WebSocket Connection Error
          </h3>

          {this.state.error && (
            <p className="mb-4 text-center text-sm text-red-700 dark:text-red-300">
              {this.state.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 w-full max-w-md">
              <summary className="cursor-pointer text-sm text-red-800 dark:text-red-200">
                Error Details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-2 text-xs dark:bg-red-900/30">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Simplified error boundary wrapper with auto-recovery
 */
export function withWebSocketErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
  }
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  return function WithWebSocketErrorBoundary(props: P) {
    return (
      <WebSocketErrorBoundary fallback={options?.fallback} onError={options?.onError}>
        <WrappedComponent {...props} />
      </WebSocketErrorBoundary>
    )
  }
}

export default WebSocketErrorBoundary
