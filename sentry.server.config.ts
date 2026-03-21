// ============================================
// Sentry Server Configuration
// Runs on the server (Node.js)
// ============================================

import * as Sentry from '@sentry/nextjs';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  // DSN from environment
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - 优化采样率
  // 生产环境使用较低的采样率，开发环境使用较高采样率用于调试
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProduction ? 0.1 : 1.0)),
  profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? (isProduction ? 0.05 : 1.0)),

  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',

  // Ignore specific errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
  ],

  // Attach stack traces
  attachStacktrace: true,

  // Server-specific integrations
  integrations: [
    // HTTP integration for tracing outgoing requests
    Sentry.httpIntegration(),
  ],

  // Before send hook
  beforeSend(event, _hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_DEBUG !== 'true') {
      return null;
    }

    // Filter sensitive headers
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers['x-api-key'];
    }

    return event;
  },
});