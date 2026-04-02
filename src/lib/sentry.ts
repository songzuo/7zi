// ============================================
// Sentry Integration - Unified Entry Point
// ============================================
// This file provides a unified API for Sentry operations across the app.
// Used by both client and server components.

import * as Sentry from "@sentry/nextjs";

// ============================================
// Types
// ============================================

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface SentryContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  user?: SentryUser;
}

// ============================================
// Initialization Check
// ============================================

let isInitialized = false;

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return isInitialized;
}

/**
 * Mark Sentry as initialized (called by sentry.client.config.ts)
 */
export function markSentryInitialized(): void {
  isInitialized = true;
}

// ============================================
// Error Capture
// ============================================

/**
 * Capture an exception with optional context
 */
export function captureException(
  error: Error | unknown,
  context?: SentryContext
): string {
  if (!isInitialized) {
    console.warn("[Sentry] Not initialized, skipping error capture");
    return "";
  }

  return Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
  });
}

/**
 * Capture a message with optional level
 */
export function captureMessage(
  message: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  context?: SentryContext
): string {
  if (!isInitialized) {
    console.warn("[Sentry] Not initialized, skipping message capture");
    return "";
  }

  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}

// ============================================
// User Context
// ============================================

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: SentryUser | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

// ============================================
// Breadcrumbs
// ============================================

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000,
  });
}

// ============================================
// Performance Monitoring
// ============================================

/**
 * Start a performance span using Sentry v10+ API
 * Note: startTransaction is deprecated in Sentry v10+
 * Use startSpan instead for modern performance monitoring
 */
export function startSpan<T>(
  name: string,
  op: string,
  callback: (span: Sentry.Span | null) => T | Promise<T>
): T | Promise<T> {
  if (!isInitialized) {
    return callback(null);
  }

  return Sentry.startSpan(
    {
      name,
      op,
    },
    callback
  );
}

/**
 * Legacy startTransaction for backward compatibility
 * @deprecated Use startSpan instead
 */
export function startTransaction(
  name: string,
  op: string
): unknown {
  if (!isInitialized) return null;

  // In Sentry v10+, startSpan should be used instead
  // This function is kept for backward compatibility but does nothing
  console.warn("[Sentry] startTransaction is deprecated, use startSpan instead");
  return null;
}

/**
 * Measure an async operation and report to Sentry
 * Uses Sentry v10+ startSpan API
 */
export async function measurePerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isInitialized) {
    return fn();
  }

  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    async (span) => {
      try {
        const result = await fn();
        span?.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span?.setStatus({ code: 2 }); // ERROR
        captureException(error, {
          tags: { transaction: name, operation },
        });
        throw error;
      }
    }
  );
}

// ============================================
// Error Boundary Integration
// ============================================

/**
 * Capture error from React Error Boundary
 */
export function captureErrorBoundaryError(
  error: Error,
  componentStack: string,
  errorInfo?: Record<string, unknown>
): void {
  captureException(error, {
    tags: { source: "error-boundary" },
    extra: {
      componentStack,
      errorInfo,
    },
  });
}

// ============================================
// Test Utilities
// ============================================

/**
 * Throw a test error to verify Sentry integration
 * Use this in development to test error reporting
 */
export function throwTestError(): never {
  const error = new Error("[Sentry Test] This is a test error");
  error.name = "SentryTestError";
  
  captureException(error, {
    tags: { test: "true" },
    extra: {
      timestamp: new Date().toISOString(),
      message: "This is a test error thrown to verify Sentry integration",
    },
  });
  
  throw error;
}

/**
 * Send a test message to Sentry
 */
export function sendTestMessage(): void {
  captureMessage("[Sentry Test] Test message from 7zi-frontend", "info", {
    tags: { test: "true" },
    extra: {
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================
// API Integration
// ============================================

/**
 * Capture API error with request context
 */
export function captureApiError(
  error: Error,
  request: {
    method: string;
    url: string;
    statusCode?: number;
  }
): void {
  captureException(error, {
    tags: {
      source: "api",
      method: request.method,
    },
    extra: {
      url: request.url,
      statusCode: request.statusCode,
    },
  });
}

// ============================================
// Export Sentry for advanced usage
// ============================================

export { Sentry };
