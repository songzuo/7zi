/**
 * @fileoverview Sentry Client-Side Configuration
 * @description Browser/Client-side Sentry initialization and configuration
 */

import * as Sentry from '@sentry/nextjs';
import {
  getCommonConfig,
  getIntegrations,
} from './sentry.config';

/**
 * Initialize Sentry for client-side
 * This file is automatically imported by Sentry SDK
 */
export function registerSentryClient() {
  const config = getCommonConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.init({
    ...config,

    // Client-specific integrations
    integrations: [
      ...getIntegrations(),
      // Browser Tracing is enabled automatically by tracesSampleRate
      // Replay integration for session replays (optional, requires additional setup)
      // new Sentry.Replay({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],

    // Client-specific beforeBreadcrumb
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out breadcrumbs that are too noisy
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        // Remove query parameters from URLs
        if (breadcrumb.data?.url) {
          try {
            const url = new URL(breadcrumb.data.url);
            url.searchParams.delete('token');
            url.searchParams.delete('api_key');
            breadcrumb.data.url = url.toString();
          } catch {
            // Invalid URL, keep as is
          }
        }
      }

      // Filter out console.log breadcrumbs in production
      if (breadcrumb.category === 'console' && config.environment === 'production') {
        return null;
      }

      return breadcrumb;
    },

    // Client-specific beforeSend
    beforeSend(event, hint) {
      // Add client-specific context
      if (typeof window !== 'undefined') {
        event.contexts = event.contexts || {};
        event.contexts.client = {
          type: 'browser',
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        };

        // Add performance data if available
        if (window.performance && window.performance.timing) {
          const timing = window.performance.timing;
          event.contexts.performance = {
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            pageLoad: timing.loadEventEnd - timing.navigationStart,
            domInteractive: timing.domInteractive - timing.navigationStart,
          };
        }
      }

      const result = config.beforeSend?.(event, hint);
      return result ?? null;
    },

    // Set user information (call this after authentication)
    // setUser({ id: user.id, email: user.email }),

    // Set tags for better filtering
    // Note: tags can be set separately if needed
    // tags: {
    //   runtime: 'browser',
    // },
  });

  console.log('[Sentry] Client initialized', {
    environment: config.environment,
    release: config.release,
    dsn: config.dsn?.substring(0, 20) + '...',
  });
}

/**
 * Set user context in Sentry
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: any;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Set additional user data in extra context
  Sentry.setExtras({
    userId: user.id,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Capture a custom message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, any>
): void {
  Sentry.withScope(scope => {
    if (extra) {
      Object.keys(extra).forEach(key => {
        scope.setExtra(key, extra[key]);
      });
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Capture a custom exception
 */
export function captureException(
  error: Error,
  extra?: Record<string, any>,
  tags?: Record<string, string>
): void {
  Sentry.withScope(scope => {
    if (extra) {
      Object.keys(extra).forEach(key => {
        scope.setExtra(key, extra[key]);
      });
    }
    if (tags) {
      Object.keys(tags).forEach(key => {
        scope.setTag(key, tags[key]);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Add a breadcrumb for user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string = 'navigation'): any {
  // Note: Transaction API has changed in newer Sentry versions
  // Use startSpan or similar API instead
  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan({
      name,
      op,
    }, () => {});
  }
  return null;
}

/**
 * Capture React component errors
 */
export function captureReactError(
  error: Error,
  errorInfo: {
    componentStack: string;
  },
  componentName: string
): void {
  Sentry.withScope(scope => {
    scope.setTag('react', true);
    scope.setTag('component', componentName);
    scope.setExtra('componentStack', errorInfo.componentStack);
    Sentry.captureException(error);
  });
}

// Auto-initialize on import
registerSentryClient();
