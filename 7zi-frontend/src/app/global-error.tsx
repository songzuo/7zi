/**
 * Global Error Boundary for App Router
 *
 * This file catches errors in the root layout and displays a user-friendly error page.
 * It must wrap the entire html and body tags because the root layout is not available
 * when an error occurs.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-error
 */

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to monitoring service
    logger.error('Global error caught', error, {
      digest: error.digest,
      category: 'global-error-boundary',
    })
  }, [error])

  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 dark:bg-gray-900">
        <div className="flex min-h-screen items-center justify-center p-4">
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
              Critical Error
            </h2>

            <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
              A critical error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6">
                <summary className="mb-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Error Details
                </summary>
                <div className="max-h-40 overflow-auto rounded bg-gray-100 p-4 font-mono text-sm text-red-700 dark:bg-gray-700 dark:text-red-400">
                  <p className="mb-2">{error.toString()}</p>
                  {error.stack && <pre className="whitespace-pre-wrap">{error.stack}</pre>}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={reset}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-800"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="rounded-lg bg-gray-200 px-6 py-2.5 font-medium text-gray-900 transition-colors hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
