/**
 * @fileoverview Global Error Handlers
 * @description Centralized global error handlers for unhandled promise rejections and uncaught exceptions
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';
import { captureError, ErrorCategory, ErrorSeverity } from '@/lib/monitoring/errors';

// Extend global interface to track setup state
declare global {
  var __globalErrorHandlersSetup: boolean | undefined;
  var __browserErrorHandlersSetup: boolean | undefined;
}

/**
 * Setup global error handlers
 * Call this during application initialization
 */
export function setupGlobalErrorHandlers(): void {
  // Only setup once
  if (typeof globalThis !== 'undefined' && globalThis.__globalErrorHandlersSetup) {
    return;
  }

  // Handle unhandled promise rejections
  if (typeof process !== 'undefined' && process.on) {
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise,
      });

      // Capture to Sentry with category
      captureError(
        reason instanceof Error ? reason : new Error(String(reason)),
        {
          category: ErrorCategory.APPLICATION,
          severity: ErrorSeverity.ERROR,
          tags: {
            type: 'unhandledRejection',
          },
          extra: {
            promise: String(promise),
          },
        }
      );

      // In development, log full details
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled Promise Rejection:', reason);
      }

      // Don't exit the process in production - let the application continue
      // In development, we want to see the error immediately
      if (process.env.NODE_ENV === 'development') {
        process.exit(1);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        message: error.message,
        stack: error.stack,
      });

      // Capture to Sentry with fatal severity
      captureError(error, {
        category: ErrorCategory.APPLICATION,
        severity: ErrorSeverity.FATAL,
        tags: {
          type: 'uncaughtException',
        },
      });

      // Log full error
      console.error('Uncaught Exception:', error);

      // Exit the process - the application is in an unknown state
      // Give time for logs to flush
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle uncaught exception monitor (Node.js 15+)
    if (process.on) {
      process.on('uncaughtExceptionMonitor', (error: Error) => {
        logger.warn('Uncaught Exception Monitor', {
          message: error.message,
          stack: error.stack,
        });
      });
    }

    // Handle warning events
    if (process.on) {
      process.on('warning', (warning: Error) => {
        logger.warn('Process Warning', {
          message: warning.message,
          stack: warning.stack,
        });
      });
    }

    // Mark as setup
    if (typeof globalThis !== 'undefined') {
      globalThis.__globalErrorHandlersSetup = true;
    }

    logger.info('Global error handlers initialized');
  }
}

/**
 * Setup browser-specific error handlers (client-side only)
 */
export function setupBrowserErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Only setup once
  if (window.__browserErrorHandlersSetup) {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    logger.error('Browser Unhandled Promise Rejection', {
      reason: String(event.reason),
    });

    // Capture to Sentry
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    Sentry.captureException(error, {
      tags: {
        type: 'browserUnhandledRejection',
      },
    });

    // Prevent default console error
    event.preventDefault();

    // In development, log full details
    if (process.env.NODE_ENV === 'development') {
      console.error('Browser Unhandled Promise Rejection:', event.reason);
    }
  });

  // Handle uncaught errors
  window.addEventListener('error', (event: ErrorEvent) => {
    logger.error('Browser Uncaught Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });

    // Capture to Sentry
    const error = event.error || new Error(event.message);
    Sentry.captureException(error, {
      tags: {
        type: 'browserUncaughtError',
      },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Mark as setup
  window.__browserErrorHandlersSetup = true;
  logger.info('Browser error handlers initialized');
}
