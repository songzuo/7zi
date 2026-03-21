// ============================================
// Sentry Client Configuration
// Runs in the browser
// ============================================

import * as Sentry from '@sentry/nextjs';

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  // DSN from environment
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring - 优化采样率以减少客户端性能影响
  // 生产环境使用较低的采样率，开发环境使用较高采样率用于调试
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? (isProduction ? 0.1 : 1.0)),
  profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? (isProduction ? 0.05 : 1.0)),

  // Session Replay - 优化采样率
  replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? (isProduction ? 0.05 : 0.5)),
  replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? (isProduction ? 0.5 : 1.0)),,

  // Environment
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  // Release version
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Debug mode (only in development)
  debug: process.env.NODE_ENV === 'development',

  // Ignore specific errors that are not actionable
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'Can\'t find variable: ZiteReader',
    'jigsaw is not defined',
    'ComboSearch is not defined',
    'atomicFindClose',
    // Random errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors (user's network issue)
    'Network request failed',
    'NetworkError',
    'Failed to fetch',
    // Canceled requests
    'cancelled',
    'canceled',
    // Navigation errors
    'Navigation cancelled',
    'NavigationDuplicated',
  ],

  // Ignore specific URLs
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Browser extensions
    /^moz-extension:\/\//i,
    // Safari extensions
    /^safari-web-extension:\/\//i,
  ],

  // Maximum breadcrumbs to keep
  maxBreadcrumbs: 50,

  // Attach stack traces
  attachStacktrace: true,

  // Capture user IP for geolocation
  sendDefaultPii: false, // Privacy-first approach

  // Integrations
  integrations: [
    // Session Replay
    Sentry.replayIntegration({
      // Mask all text - privacy first
      maskAllText: true,
      // Block all media
      blockAllMedia: true,
    }),
    // Browser Tracing
    Sentry.browserTracingIntegration(),
  ],

  // Before send hook - filter sensitive data
  beforeSend(event, _hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SENTRY_DEBUG !== 'true') {
      return null;
    }

    // Filter out sensitive information
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }

    return event;
  },

  // Before breadcrumb hook
  beforeBreadcrumb(breadcrumb, _hint) {
    // Filter out sensitive data from breadcrumbs
    if (breadcrumb.category === 'http') {
      // Don't log request/response bodies
      if (breadcrumb.data) {
        delete breadcrumb.data.body;
      }
    }
    return breadcrumb;
  },
});