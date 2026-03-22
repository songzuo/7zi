/**
 * @fileoverview Shared Sentry Configuration
 * @description Common configuration shared between client and server Sentry setups
 */

import type { BrowserOptions } from '@sentry/nextjs';

/**
 * Get the Sentry DSN from environment variables
 */
export function getSentryDsn(): string | undefined {
  // Client-side DSN (exposed to browser)
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SENTRY_DSN;
  }
  // Server-side DSN
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
}

/**
 * Get the environment name for Sentry
 */
export function getSentryEnvironment(): string {
  return process.env.NODE_ENV || 'development';
}

/**
 * Get the release version for Sentry
 */
export function getSentryRelease(): string | undefined {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION;
  const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA;

  if (gitCommit) {
    return `${version || '1.0.0'}+${gitCommit.substring(0, 7)}`;
  }

  return version;
}

/**
 * Get sample rate based on environment
 */
export function getSampleRate(): number {
  const env = getSentryEnvironment();

  switch (env) {
    case 'production':
      return 0.1; // 10% sampling in production
    case 'staging':
      return 0.5; // 50% sampling in staging
    default:
      return 1.0; // 100% sampling in development
  }
}

/**
 * Get traces sample rate for performance monitoring
 */
export function getTracesSampleRate(): number {
  const env = getSentryEnvironment();

  switch (env) {
    case 'production':
      return 0.05; // 5% sampling for performance in production
    case 'staging':
      return 0.1; // 10% sampling for performance in staging
    default:
      return 1.0; // 100% sampling in development
  }
}

/**
 * Get profiles sample rate for profiling
 */
export function getProfilesSampleRate(): number {
  const env = getSentryEnvironment();

  switch (env) {
    case 'production':
      return 0.01; // 1% sampling for profiling in production
    case 'staging':
      return 0.05; // 5% sampling for profiling in staging
    default:
      return 0.5; // 50% sampling in development
  }
}

/**
 * Common before send filter for both client and server
 */
export function beforeSendFilter(event: any, hint?: any): any {
  const error = hint?.originalException;

  // Filter out specific error types
  if (error) {
    // Ignore network errors that are often transient
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return null;
      }
      if (error.name === 'ChunkLoadError') {
        // Don't filter these - they're important for deployment monitoring
        // Add context about chunk loading
        event.tags = {
          ...event.tags,
          errorType: 'ChunkLoadError',
        };
      }
    }

    // Filter out 404 errors from bots/crawlers
    if (event.request) {
      const userAgent = event.request.headers?.['User-Agent'] || '';
      if (userAgent.includes('bot') || userAgent.includes('crawler')) {
        return null;
      }
    }
  }

  return event;
}

/**
 * Filter out sensitive data from event
 */
export function filterSensitiveData(event: any): any {
  if (event.request) {
    // Remove sensitive headers
    if (event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }

    // Remove sensitive data from URL
    if (event.request.url) {
      try {
        const url = new URL(event.request.url);
        url.searchParams.delete('token');
        url.searchParams.delete('api_key');
        url.searchParams.delete('password');
        url.searchParams.delete('secret');
        event.request.url = url.toString();
      } catch {
        // Invalid URL, keep as is
      }
    }
  }

  // Filter user data
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  // Filter out sensitive data from extra
  if (event.extra) {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    for (const key of Object.keys(event.extra)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        event.extra[key] = '[REDACTED]';
      }
    }
  }

  return event;
}

/**
 * Integrations configuration
 */
export function getIntegrations(): any[] {
  const integrations: any[] = [];

  // Browser-only integrations
  if (typeof window !== 'undefined') {
    // Add browser-specific integrations here
    // import { BrowserTracing } from '@sentry/nextjs';
    // integrations.push(new BrowserTracing());
  }

  return integrations;
}

/**
 * Deny specific URLs from sending errors
 */
export const denyUrls: (string | RegExp)[] = [
  // Chrome extensions
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^extensions\//i,
  /^file:\/\//i,
  // Firefox extensions
  /^moz-extension:\/\//i,
  // Safari extensions
  /^safari-web-extension:\/\//i,
  // Local files
  /^file:/i,
];

/**
 * Allow specific URLs for error reporting
 */
export const allowUrls: (string | RegExp)[] = [
  // Allow errors from production domains
  process.env.NEXT_PUBLIC_APP_URL || '',
  'https://7zi.com',
  'https://7zi.studio',
].filter(Boolean);

/**
 * Filter errors from specific URLs
 */
export function filterErrorUrls(event: any): any {
  if (event.request?.url) {
    const url = event.request.url;

    // Check if URL matches any deny pattern
    for (const pattern of denyUrls) {
      if (typeof pattern === 'string') {
        if (url.includes(pattern)) {
          return null;
        }
      } else if (pattern instanceof RegExp && pattern.test(url)) {
        return null;
      }
    }

    // Check if URL matches any allow pattern (if allowUrls is not empty)
    if (allowUrls.length > 0) {
      const isAllowed = allowUrls.some(allowUrl => {
        if (typeof allowUrl === 'string') {
          try {
            const parsedUrl = new URL(url);
            const parsedAllowUrl = new URL(allowUrl);
            return parsedUrl.hostname === parsedAllowUrl.hostname;
          } catch {
            return false;
          }
        } else if (allowUrl instanceof RegExp) {
          return allowUrl.test(url);
        }
        return false;
      });

      if (!isAllowed && getSentryEnvironment() === 'production') {
        return null;
      }
    }
  }

  return event;
}

/**
 * Get the common configuration options
 */
export function getCommonConfig(): Partial<BrowserOptions> {
  const dsn = getSentryDsn();

  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Sentry will not be initialized.');
    return {
      enabled: false,
    };
  }

  return {
    dsn,
    enabled: true,
    environment: getSentryEnvironment(),
    release: getSentryRelease(),
    debug: getSentryEnvironment() === 'development',

    // Sample rates
    sampleRate: getSampleRate(),
    tracesSampleRate: getTracesSampleRate(),
    profilesSampleRate: getProfilesSampleRate(),

    // Filters
    beforeSend(event, hint) {
      let filteredEvent = beforeSendFilter(event, hint);
      if (filteredEvent) {
        filteredEvent = filterErrorUrls(filteredEvent);
      }
      if (filteredEvent) {
        filteredEvent = filterSensitiveData(filteredEvent);
      }
      return filteredEvent;
    },

    // URL filtering
    denyUrls,
    allowUrls,

    // Attach stack traces
    attachStacktrace: true,

    // Normalize depth
    normalizeDepth: 10,

    // Max breadcrumb count
    maxBreadcrumbs: 100,

    // Initial scope
    initialScope: {
      tags: {
        platform: 'web',
        framework: 'nextjs',
      },
    },
  };
}
