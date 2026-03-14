import React, { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Fallback UI to show on error */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Show error details (for development) */
  showDetails?: boolean;
  /** Custom error message to display */
  errorMessage?: string;
}

export interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
}

/**
 * ErrorBoundary component that catches React component errors
 * and displays a friendly fallback UI
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorBoundary] Caught an error:', error, errorInfo);
    }

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const isDev = process.env.NODE_ENV === 'development';
      const showDetails = this.props.showDetails ?? isDev;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-destructive/10">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h2 className="text-lg font-semibold text-card-foreground mb-2">
            {this.props.errorMessage || 'Something went wrong'}
          </h2>
          
          <p className="text-sm text-muted-foreground text-center mb-4">
            An unexpected error occurred. Please try again.
          </p>

          {showDetails && this.state.error && (
            <div className="w-full p-3 mb-4 bg-muted rounded-md overflow-auto max-h-32">
              <p className="text-xs font-mono text-destructive">
                {this.state.error.message}
              </p>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
