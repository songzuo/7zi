/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for the Next.js Edge Runtime (middleware, Edge API routes)
 * @sentry/nextjs CLI automatically picks this up during the build process
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Set sampling rate for transactions
  tracesSampleRate: 1.0,

  // Only capture errors in production or if explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release version
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Filter errors before sending
  beforeSend(event, hint) {
    // Filter out client-side errors in development
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) {
      return null;
    }

    // Example: Filter out specific error types
    const error = hint?.originalException;
    if (error) {
      // Don't send network errors (these are handled separately)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return null;
      }
    }

    return event;
  },

  // Attach stack traces to all messages
  attachStacktrace: true,

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_ENABLED === 'true',
});