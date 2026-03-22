/**
 * @fileoverview Global Error Handler
 * @description Next.js global error handler (app directory)
 *
 * This file is the highest-level error boundary in Next.js app router.
 * It catches errors that occur during rendering and returns a fallback UI.
 *
 * See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

'use client';

import { useEffect } from 'react';
import { captureReactError, addBreadcrumb } from '@/lib/monitoring/sentry.client.config';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Capture the error in Sentry
    captureReactError(error, { componentStack: error.stack || '' }, 'GlobalError');

    // Add breadcrumb for context
    addBreadcrumb(
      'Global error caught',
      'global-error',
      'error',
      {
        errorMessage: error.message,
        errorName: error.name,
        digest: error.digest,
      }
    );

    console.error('[GlobalError] Error caught:', error);
  }, [error]);

  const handleReload = (): void => {
    window.location.reload();
  };

  const handleReset = (): void => {
    reset();
  };

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-600 dark:text-red-400"
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

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Application Error
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Error ID: {error.digest || 'Unknown'}
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-8">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Error Details:
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 font-mono mb-1">
                {error.name}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {error.message}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={handleReload}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Show Stack Trace (Development Only)
                </summary>
                <pre className="mt-3 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-auto max-h-64">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
