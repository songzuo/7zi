/**
 * @fileoverview Sentry Client Configuration (Next.js)
 * @description This file is automatically imported by the Sentry SDK
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  debug: process.env.NODE_ENV === 'development',

  // Sample rates
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Before send filter
  beforeSend(event, hint) {
    // Filter out errors from browsers/extensions
    if (event.request?.url) {
      if (
        event.request.url.startsWith('chrome-extension://') ||
        event.request.url.startsWith('moz-extension://') ||
        event.request.url.startsWith('file://')
      ) {
        return null;
      }
    }

    // Filter out specific error types
    const error = hint?.originalException as Error;
    if (error?.name === 'AbortError') {
      return null;
    }

    return event;
  },

  // Breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out console logs in production
    if (breadcrumb.category === 'console' && process.env.NODE_ENV === 'production') {
      return null;
    }

    return breadcrumb;
  },

  // Integrations
  integrations: [
    // Browser Tracing is automatically enabled by tracesSampleRate
    // Replay is optional and requires additional setup
    // new Sentry.Replay({
    //   maskAllText: true,
    //   blockAllMedia: true,
    // }),
  ],

  // Deny URLs
  denyUrls: [
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    /safari-web-extension:\/\//i,
    /file:\/\//i,
  ],

  // Initial scope
  initialScope: {
    tags: {
      platform: 'web',
      framework: 'nextjs',
    },
  },

  // Attach stack traces
  attachStacktrace: true,

  // Normalize depth
  normalizeDepth: 10,

  // Max breadcrumbs
  maxBreadcrumbs: 100,
});
