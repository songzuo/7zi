/**
 * @fileoverview Sentry Server Configuration (Next.js)
 * @description This file is automatically imported by the Sentry SDK
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',

  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  debug: process.env.NODE_ENV === 'development',

  // Sample rates
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Before send filter
  beforeSend(event, hint) {
    // Filter out health check requests
    if (event.request?.url) {
      if (event.request.url.includes('/health') || event.request.url.includes('/ready')) {
        return null;
      }
    }

    return event;
  },

  // Breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out health check breadcrumbs
    if (breadcrumb.category === 'http') {
      if (breadcrumb.data?.url?.includes('/health') || breadcrumb.data?.url?.includes('/ready')) {
        return null;
      }
    }

    return breadcrumb;
  },

  // Traces sampler
  tracesSampler: samplingContext => {
    // Always sample transactions from API routes
    if (samplingContext.transactionName) {
      const name = samplingContext.transactionName.toLowerCase();
      if (name.includes('/api/')) {
        return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
      }
      if (name.includes('/health') || name.includes('/ready')) {
        return 0;
      }
    }

    return process.env.NODE_ENV === 'production' ? 0.05 : 1.0;
  },

  // Initial scope
  initialScope: {
    tags: {
      platform: 'nodejs',
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
