// ============================================
// Sentry Test API Endpoint
// ============================================
// This endpoint is used to test Sentry integration in production.
// Access: GET /api/sentry-test?type=error|message

import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createSuccessResponse, createErrorResponse, createServiceUnavailableError } from '@/lib/api/error-handler'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'message'

  // Check if Sentry is configured
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!sentryDsn) {
    return createServiceUnavailableError('Sentry DSN not configured')
  }

  try {
    if (type === 'error') {
      // Throw a test error
      const testError = new Error('[Sentry Test] API Error Test')
      testError.name = 'SentryTestError'

      Sentry.captureException(testError, {
        tags: {
          test: 'true',
          source: 'api',
        },
        extra: {
          timestamp: new Date().toISOString(),
          endpoint: '/api/sentry-test',
          method: 'GET',
        },
      })

      return createSuccessResponse({
        message: 'Test error sent to Sentry',
        details: {
          type: 'error',
          name: testError.name,
          message: testError.message,
          dsn: sentryDsn.substring(0, 30) + '...',
        },
      })
    } else {
      // Send a test message
      Sentry.captureMessage('[Sentry Test] API Message Test', {
        level: 'info',
        tags: {
          test: 'true',
          source: 'api',
        },
        extra: {
          timestamp: new Date().toISOString(),
          endpoint: '/api/sentry-test',
          method: 'GET',
        },
      })

      return createSuccessResponse({
        message: 'Test message sent to Sentry',
        details: {
          type: 'message',
          level: 'info',
          dsn: sentryDsn.substring(0, 30) + '...',
        },
      })
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to send test to Sentry'))
  }
}
