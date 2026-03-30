/**
 * ErrorFallback Component
 *
 * Error fallback UI with recovery mechanisms
 * Used by ErrorBoundary and can be used standalone
 *
 * @example
 * <ErrorFallback
 *   error={new Error('Something went wrong')}
 *   errorInfo={errorInfo}
 *   resetError={() => {}}
 * />
 */

'use client';

import React, { memo } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import type { ErrorFallbackProps } from './ErrorBoundary';

interface ErrorFallbackConfig {
  /**
   * Custom title
   * @default 'Something went wrong'
   */
  title?: string;

  /**
   * Custom message
   * @default 'An unexpected error occurred. Please try again.'
   */
  message?: string;

  /**
   * Whether to show error details
   * @default true in development
   */
  showErrorDetails?: boolean;

  /**
   * Whether to show recovery options
   * @default true
   */
  showRecoveryOptions?: boolean;

  /**
   * Whether to show support link
   * @default true
   */
  showSupportLink?: boolean;

  /**
   * Support email or URL
   * @default 'mailto:support@example.com'
   */
  supportContact?: string;

  /**
   * Additional actions to show
   */
  additionalActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;

  /**
   * Custom styles
   */
  className?: string;
}

/**
 * Simple error fallback for minimal UI
 */
export function SimpleErrorFallback({
  error,
  resetError,
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Something went wrong
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * Full-featured error fallback with recovery options
 */
export function FullErrorFallback({
  error,
  errorInfo,
  resetError,
  config = {},
}: ErrorFallbackProps & { config?: ErrorFallbackConfig }) {
  const [copied, setCopied] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(
    config.showErrorDetails ?? process.env.NODE_ENV === 'development'
  );

  const {
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    showErrorDetails: showErrorDetailsProp,
    showRecoveryOptions = true,
    showSupportLink = true,
    supportContact = 'mailto:support@example.com',
    additionalActions = [],
    className = '',
  } = config;

  const handleCopyError = () => {
    const errorText = `
Error: ${error?.toString()}
Time: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Stack Trace:
${errorInfo?.componentStack || 'N/A'}
    `.trim();

    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 ${className}`}>
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title and message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-3">
          {title}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          {message}
        </p>

        {/* Error details toggle */}
        {(config.showErrorDetails ?? process.env.NODE_ENV === 'development') && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors mb-2"
            >
              <Bug className="w-4 h-4 mr-2" />
              {showDetails ? 'Hide Error Details' : 'Show Error Details'}
            </button>

            {showDetails && error && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Error Information
                  </h3>
                  <button
                    onClick={handleCopyError}
                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Error Message
                    </p>
                    <p className="text-sm font-mono text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {error.toString()}
                    </p>
                  </div>

                  {errorInfo && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Component Stack
                      </p>
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recovery options */}
        {showRecoveryOptions && (
          <div className="space-y-3 mb-8">
            <button
              onClick={resetError}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Home
            </button>

            {additionalActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="w-full flex items-center justify-center px-6 py-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Support link */}
        {showSupportLink && (
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Problem still persists?
            </p>
            <a
              href={supportContact}
              className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <FileText className="w-4 h-4 mr-1" />
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card-style error fallback for inline use
 */
export function CardErrorFallback({
  error,
  resetError,
  config = {},
}: ErrorFallbackProps & { config?: Omit<ErrorFallbackConfig, 'showErrorDetails' | 'showSupportLink'> }) {
  const {
    title = 'Error',
    message = 'An error occurred',
    showRecoveryOptions = true,
    additionalActions = [],
    className = '',
  } = config;

  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {message}
          </p>

          {showRecoveryOptions && (
            <div className="flex gap-2">
              <button
                onClick={resetError}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Retry
              </button>
              {additionalActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Default ErrorFallback component
 */
export function ErrorFallback({
  error,
  errorInfo,
  resetError,
  config,
}: ErrorFallbackProps & { config?: ErrorFallbackConfig }) {
  // Use full-featured fallback by default
  return (
    <FullErrorFallback
      error={error}
      errorInfo={errorInfo}
      resetError={resetError}
      config={config}
    />
  );
}

export default memo(ErrorFallback);
