/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the Next.js client-side (browser)
 * @sentry/nextjs CLI automatically picks this up during the build process
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Set sampling rate for performance monitoring
  tracesSampleRate: 1.0,

  // Set sampling rate for session replay
  // This sets the sample rate at 10% for sessions
  // replaysSessionSampleRate: 0.1,
  // This sets the sample rate at 100% for sessions where an error occurs
  // replaysOnErrorSampleRate: 1.0,

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

      // Filter out errors from specific scripts/extensions
      if (error instanceof Error && error.stack) {
        const stack = error.stack.toLowerCase();
        if (stack.includes('extension') || stack.includes('chrome-extension')) {
          return null;
        }
      }
    }

    return event;
  },

  // Attach stack traces to all messages
  attachStacktrace: true,

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_ENABLED === 'true',

  // Capture unhandled errors and uncaught exceptions
  // NOTE: Sentry SDK automatically handles this

  // Integrations
  integrations: [
    // Enable HTTP request tracing (Sentry v8+ style)
    Sentry.browserTracingIntegration(),
    // // Session Replay
    // Sentry.replayIntegration({
    //   // Additional Replay configuration goes in here, for example:
    //   maskAllText: true,
    //   blockAllMedia: true,
    // }),
  ],

  // Before breadcrumb is sent
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out certain breadcrumbs
    if (breadcrumb.category === 'http') {
      // Filter out analytics requests
      if (breadcrumb.data?.url?.includes('analytics')) {
        return null;
      }
    }
    return breadcrumb;
  },

  // Set user context if available
  // NOTE: This should be set dynamically when user logs in
  // initialScope: {
  //   user: { id: 'user-id', email: 'user@example.com' },
  // },
});
