/**
 * Error Pages Test Utility
 * Use this to test different error scenarios
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'

/**
 * Simulate different error types for testing
 * Access these routes to see different error pages:
 *
 * - /test-error/not-found    → 404 page
 * - /test-error/server        → 500 page
 * - /test-error/unauthorized  → 401 page
 * - /test-error/forbidden     → 403 page
 * - /test-error/network       → Network error
 */

export const dynamic = 'force-dynamic'

export default function TestErrorPage({ searchParams }: { searchParams: { type?: string } }) {
  const type = searchParams.type || 'generic'

  switch (type) {
    case 'not-found':
      // This will trigger the not-found page
      redirect('/this-page-does-not-exist')

    case 'server':
      // This will trigger the error page
      throw new Error('This is a simulated server error for testing purposes')

    case 'unauthorized':
      // Simulate 401 error
      throw new Error('Unauthorized: You need to log in to access this page')

    case 'forbidden':
      // Simulate 403 error
      throw new Error('Forbidden: You do not have permission to access this resource')

    case 'network':
      // Simulate network error
      throw new Error('Network: Failed to connect to the server')

    default:
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
          <div className="w-full max-w-lg">
            <h1 className="mb-6 text-3xl font-bold text-zinc-900 dark:text-white">
              Error Pages Test
            </h1>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Click the links below to test different error scenarios:
            </p>
            <div className="space-y-3">
              <Link
                href="/test-error?type=not-found"
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">404 Not Found</h2>
                <p className="text-sm text-zinc-500">Test the 404 page</p>
              </Link>
              <Link
                href="/test-error?type=server"
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">
                  500 Server Error
                </h2>
                <p className="text-sm text-zinc-500">Test the 500 error page</p>
              </Link>
              <Link
                href="/test-error?type=unauthorized"
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">
                  401 Unauthorized
                </h2>
                <p className="text-sm text-zinc-500">Test the unauthorized page</p>
              </Link>
              <Link
                href="/test-error?type=forbidden"
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">403 Forbidden</h2>
                <p className="text-sm text-zinc-500">Test the forbidden page</p>
              </Link>
              <Link
                href="/test-error?type=network"
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="mb-1 font-semibold text-zinc-900 dark:text-white">Network Error</h2>
                <p className="text-sm text-zinc-500">Test the network error page</p>
              </Link>
            </div>
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> These test routes are for development purposes only. Remove
                them before deploying to production.
              </p>
            </div>
          </div>
        </div>
      )
  }
}
