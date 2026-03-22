/**
 * @fileoverview Global Error Boundary Component
 * @description React Error Boundary that catches errors in the component tree
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureReactError, setSentryUser, addBreadcrumb } from '@/lib/monitoring/sentry.client.config';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  componentName?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  resetOnPropsChange?: boolean;
}

/**
 * Global Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree below it,
 * logs those errors to Sentry, and displays a fallback UI.
 *
 * @example
 * <ErrorBoundary componentName="Dashboard">
 *   <Dashboard />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      componentName: props.componentName,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture the error in Sentry
    const componentName = this.state.componentName || this.props.componentName || 'Unknown';
    captureReactError(error, { componentStack: errorInfo.componentStack || '' }, componentName);

    // Add breadcrumb for context
    addBreadcrumb(
      `Error caught in ${componentName}`,
      'error-boundary',
      'error',
      {
        errorMessage: error.message,
        errorName: error.name,
      }
    );

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary when props change (if enabled)
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          componentName={this.state.componentName}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  componentName?: string;
  onReset: () => void;
}

export function ErrorFallback({
  error,
  errorInfo,
  errorId,
  componentName,
  onReset,
}: ErrorFallbackProps): React.ReactElement {
  const handleReload = (): void => {
    window.location.reload();
  };

  const handleReset = (): void => {
    onReset();
  };

  const errorName = error?.name || 'Unknown Error';
  const errorMessage = error?.message || 'An unexpected error occurred';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
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
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We apologize for the inconvenience. The error has been reported.
          </p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Error Details:
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 font-mono mb-1">
            {errorName}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {errorMessage}
          </p>
          {errorId && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Error ID: {errorId}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Go to Home
          </button>
        </div>

        {errorInfo && process.env.NODE_ENV === 'development' && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Show Stack Trace (Development Only)
            </summary>
            <pre className="mt-2 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-auto max-h-48">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Higher-Order Component (HOC) that wraps a component with ErrorBoundary
 *
 * @example
 * const SafeComponent = withErrorBoundary(MyComponent, { componentName: 'MyComponent' });
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook to set user context in ErrorBoundary
 */
export function setErrorBoundaryUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  setSentryUser(user);
  addBreadcrumb(
    `User context set: ${user.email || user.id}`,
    'error-boundary',
    'info',
    { userId: user.id }
  );
}
