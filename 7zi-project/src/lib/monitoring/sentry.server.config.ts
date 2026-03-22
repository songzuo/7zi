/**
 * @fileoverview Sentry Server-Side Configuration
 * @description Server-side (API routes, server components) Sentry initialization and configuration
 */

import * as Sentry from '@sentry/nextjs';
import {
  getCommonConfig,
  getIntegrations,
} from './sentry.config';

/**
 * Initialize Sentry for server-side
 */
export function registerSentryServer() {
  const config = getCommonConfig();

  if (!config.enabled) {
    return;
  }

  Sentry.init({
    ...config,

    // Server-specific integrations
    integrations: [
      ...getIntegrations(),
      // Add server-specific integrations here
      // new Sentry.Integrations.Http({ tracing: true }),
      // new Sentry.Integrations.Express(),
    ],

    // Server-specific beforeBreadcrumb
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out health check breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        if (breadcrumb.data.url.includes('/health') || breadcrumb.data.url.includes('/ready')) {
          return null;
        }
      }

      return breadcrumb;
    },

    // Server-specific beforeSend
    beforeSend(event, hint) {
      // Add server-specific context
      if (typeof process !== 'undefined') {
        event.contexts = event.contexts || {};
        event.contexts.server = {
          type: 'nodejs',
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        };

        // Add environment variables (sanitized)
        event.contexts.environment = {
          env: process.env.NODE_ENV,
          region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown',
        };
      }

      const result = config.beforeSend?.(event, hint);
      return result ?? null;
    },

    // Set tags for better filtering
    // Note: tags can be set separately if needed
    // tags: {
    //   runtime: 'nodejs',
    // },

    // Request tracing
    tracesSampler: samplingContext => {
      // Always sample transactions from specific endpoints
      if (samplingContext.transactionName) {
        const name = samplingContext.transactionName.toLowerCase();
        if (name.includes('/api/')) {
          return 0.1; // Sample 10% of API calls
        }
        if (name.includes('/health') || name.includes('/ready')) {
          return 0; // Don't sample health checks
        }
      }

      // Use the default tracesSampleRate
      return getCommonConfig().tracesSampleRate || 0;
    },
  });

  console.log('[Sentry] Server initialized', {
    environment: config.environment,
    release: config.release,
    dsn: config.dsn?.substring(0, 20) + '...',
  });
}

/**
 * Set user context in Sentry (server-side)
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
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Capture a custom message (server-side)
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
 * Capture a custom exception (server-side)
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
 * Add a breadcrumb for server actions
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
 * Wrap an async function with error tracking
 */
export function withSentryTracking<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    // Note: Transaction API has changed, using withScope for error tracking
    return Sentry.withScope(async scope => {
      scope.setTransactionName(name);

      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        Sentry.captureException(error as Error);
        throw error;
      }
    });
  }) as unknown as T;
}

/**
 * Wrap an API route handler with error tracking
 */
export function withApiRouteTracking<T extends (...args: any[]) => Promise<Response>>(
  path: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as Request;

    // Extract request metadata
    const url = new URL(request.url);
    const transactionName = `${request.method} ${url.pathname}`;

    return Sentry.withScope(async scope => {
      scope.setTransactionName(transactionName);
      scope.setTag('route', path);
      scope.setExtra('method', request.method);
      scope.setExtra('url', request.url);

      // Add request headers (sanitized)
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        if (
          !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
        ) {
          headers[key] = value;
        }
      });
      scope.setExtra('headers', headers);

      try {
        const result = await fn(...args);
        scope.setExtra('statusCode', result.status);
        return result;
      } catch (error) {
        const status = (error as any).status || 500;
        scope.setExtra('statusCode', status);

        Sentry.captureException(error as Error);
        throw error;
      }
    });
  }) as unknown as T;
}

/**
 * Middleware for Next.js API routes
 */
export function sentryMiddleware(
  handler: (req: any, res: any) => Promise<any>
): (req: any, res: any) => Promise<any> {
  return async (req, res) => {
    return Sentry.withScope(async scope => {
      scope.setTag('method', req.method);
      scope.setTag('url', req.url);
      scope.setExtra('query', req.query);
      scope.setExtra('body', req.body);

      try {
        const result = await handler(req, res);
        return result;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  };
}

// Auto-initialize on import
registerSentryServer();
