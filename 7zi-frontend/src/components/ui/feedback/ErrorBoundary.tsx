/**
 * ErrorBoundary Component
 *
 * React error boundary for catching and handling component errors
 *
 * @example
 * <ErrorBoundary
 *   fallback={<ErrorFallback />}
 *   onError={(error) => logError(error)}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 */

'use client'

import React, { Component, ReactNode, ErrorInfo, ComponentType, memo } from 'react'

export interface ErrorBoundaryProps {
  /**
   * Child components
   */
  children: ReactNode

  /**
   * Fallback UI to show when an error occurs
   * Can be a React element or a component
   */
  fallback?: ReactNode | ComponentType<ErrorFallbackProps>

  /**
   * Whether to reset the error boundary on location change
   * @default true
   */
  resetOnLocationChange?: boolean

  /**
   * Callback when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void

  /**
   * Callback when the error boundary resets
   */
  onReset?: () => void

  /**
   * Additional props to pass to custom fallback component
   */
  fallbackProps?: Record<string, unknown>
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export interface ErrorFallbackProps {
  /**
   * The error that was caught
   */
  error: Error | null

  /**
   * Error info containing component stack
   */
  errorInfo: ErrorInfo | null

  /**
   * Function to reset the error boundary
   */
  resetError: () => void
}

interface ErrorBoundaryContextValue {
  error: Error | null
  resetError: () => void
}

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue | null>(null)

/**
 * Default ErrorFallback component
 */
export function ErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
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
        </div>

        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
          Something went wrong
        </h2>

        <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        {/* Error details in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6">
            <summary className="mb-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
              Error Details
            </summary>
            <div className="max-h-40 overflow-auto rounded bg-gray-100 p-4 font-mono text-sm text-red-700 dark:bg-gray-700 dark:text-red-400">
              <p className="mb-2">{error.toString()}</p>
              {errorInfo && <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>}
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={resetError}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus:ring-offset-gray-800"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="rounded-lg bg-gray-200 px-6 py-2.5 font-medium text-gray-900 transition-colors hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ErrorBoundary component
 */
class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Call error callback
    this.props.onError?.(error, errorInfo)

    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Log error to service (if available)
    if (typeof window !== 'undefined' && window.trackError) {
      window.trackError(error, errorInfo)
    }
  }

  componentDidCatchPreviousLocation?: string

  componentDidUpdate(): void {
    // Reset on location change
    if (
      this.props.resetOnLocationChange !== false &&
      this.state.hasError &&
      typeof window !== 'undefined'
    ) {
      const currentLocation = window.location.href
      if (this.componentDidCatchPreviousLocation !== currentLocation) {
        this.resetErrorBoundary()
      }
      this.componentDidCatchPreviousLocation = currentLocation
    }
  }

  resetErrorBoundary = (): void => {
    const { error, errorInfo } = this.state

    this.props.onReset?.()

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Call reset callback with previous error info
    if (error && errorInfo && this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, fallbackProps = {} } = this.props

    if (hasError) {
      const contextValue: ErrorBoundaryContextValue = {
        error,
        resetError: this.resetErrorBoundary,
      }

      // Render custom fallback
      if (fallback) {
        // Check if fallback is a component function
        if (typeof fallback === 'function') {
          const FallbackComponent = fallback as ComponentType<ErrorFallbackProps>
          return (
            <ErrorBoundaryContext.Provider value={contextValue}>
              <FallbackComponent
                error={error}
                errorInfo={errorInfo}
                resetError={this.resetErrorBoundary}
                {...fallbackProps}
              />
            </ErrorBoundaryContext.Provider>
          )
        }

        // Render fallback as a React element
        return (
          <ErrorBoundaryContext.Provider value={contextValue}>
            {fallback}
          </ErrorBoundaryContext.Provider>
        )
      }

      // Render default fallback
      return (
        <ErrorBoundaryContext.Provider value={contextValue}>
          <ErrorFallback error={error} errorInfo={errorInfo} resetError={this.resetErrorBoundary} />
        </ErrorBoundaryContext.Provider>
      )
    }

    return children
  }
}

/**
 * Hook to access error boundary context
 */
export function useErrorBoundary(): ErrorBoundaryContextValue {
  const context = React.useContext(ErrorBoundaryContext)

  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundary')
  }

  return context
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = memo((props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  ))

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * ErrorBoundary component (wrapped with memo)
 */
export const ErrorBoundary = memo(ErrorBoundaryClass)

export default ErrorBoundary
