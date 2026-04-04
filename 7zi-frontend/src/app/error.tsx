/**
 * Error Boundary for App Router
 *
 * This file catches errors in route segments and displays a user-friendly error page.
 * It wraps all page components automatically in Next.js App Router.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */

'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/ui/feedback/ErrorFallback'
import { logger } from '@/lib/logger'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to monitoring service
    logger.error('Route error caught', error, {
      digest: error.digest,
      category: 'error-boundary',
    })
  }, [error])

  return (
    <ErrorFallback
      error={error}
      errorInfo={null}
      resetError={reset}
    />
  )
}
