/**
 * Sentry Test Utilities
 * Helper functions to test Sentry integration
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Test Sentry integration by throwing a controlled error
 * Only works in development or when NEXT_PUBLIC_SENTRY_DEBUG=true
 */
export function testSentryIntegration() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DEBUG !== 'true') {
    console.warn(
      '⚠️ Sentry test is disabled in production. Set NEXT_PUBLIC_SENTRY_DEBUG=true to enable.'
    )
    return
  }

  try {
    // Test 1: Capture a simple exception
    Sentry.captureException(new Error('Sentry Integration Test Exception'))

    // Test 2: Capture a message
    Sentry.captureMessage('Sentry Integration Test Message', 'info')

    // Test 3: Capture with context
    Sentry.withScope(scope => {
      scope.setTag('test', 'integration')
      scope.setLevel('info')
      scope.setExtra('customData', {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      })
      Sentry.captureMessage('Sentry Integration Test with Context')
    })

    // Test 4: Throw an error to test error boundary
    setTimeout(() => {
      throw new Error('Sentry Integration Test - Async Error')
    }, 100)
  } catch (error) {
    console.error('❌ Sentry test failed:', error)
  }
}

/**
 * Get current Sentry configuration status
 */
export function getSentryStatus() {
  return {
    dsn: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1),
    replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1.0),
  }
}

/**
 * Log Sentry status to console (development only)
 */
export function logSentryStatus() {
  // Status logging disabled
}
