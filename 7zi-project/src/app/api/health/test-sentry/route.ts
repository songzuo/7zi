/**
 * @fileoverview Sentry Test Route
 * @description Test route to verify Sentry error reporting is working correctly
 *
 * Usage:
 * - GET /api/health/test-sentry - Test Sentry initialization
 * - POST /api/health/test-sentry - Test Sentry error capture
 */

import { NextRequest, NextResponse } from 'next/server';
import { captureException, captureMessage, addBreadcrumb } from '@/lib/monitoring/sentry.server.config';

/**
 * GET /api/health/test-sentry
 * Test Sentry initialization
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Add breadcrumb
    addBreadcrumb(
      'Sentry test endpoint called',
      'sentry-test',
      'info',
      { method: 'GET', url: request.url }
    );

    // Check if Sentry is configured
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';

    return NextResponse.json({
      status: 'success',
      message: 'Sentry test endpoint is reachable',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      config: {
        dsnConfigured: !!dsn,
        dsnPrefix: dsn ? dsn.substring(0, 20) + '...' : 'not-configured',
        environment,
      },
    });
  } catch (error) {
    captureException(error as Error, {
      endpoint: '/api/health/test-sentry',
      method: 'GET',
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Error occurred in Sentry test endpoint',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/test-sentry
 * Test Sentry error capture
 *
 * Request body:
 * {
 *   type: 'exception' | 'message' | 'breadcrumb'
 *   message?: string
 *   level?: 'debug' | 'info' | 'warning' | 'error'
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { type = 'exception', message, level = 'error' } = body;

    // Add breadcrumb for the test
    addBreadcrumb(
      `Sentry test: ${type}`,
      'sentry-test',
      level,
      { type, message, url: request.url }
    );

    switch (type) {
      case 'exception': {
        const errorMessage = message || 'Test exception from /api/health/test-sentry';
        const testError = new Error(errorMessage);
        testError.name = 'SentryTestError';

        captureException(testError, {
          endpoint: '/api/health/test-sentry',
          method: 'POST',
          testType: 'exception',
        });

        return NextResponse.json({
          status: 'success',
          message: 'Test exception captured in Sentry',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          error: {
            name: testError.name,
            message: testError.message,
          },
        });
      }

      case 'message': {
        const testMessage = message || 'Test message from /api/health/test-sentry';

        captureMessage(testMessage, level as any, {
          endpoint: '/api/health/test-sentry',
          method: 'POST',
          testType: 'message',
        });

        return NextResponse.json({
          status: 'success',
          message: 'Test message captured in Sentry',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          capturedMessage: testMessage,
          level,
        });
      }

      case 'breadcrumb': {
        const breadcrumbMessage = message || 'Test breadcrumb from /api/health/test-sentry';

        addBreadcrumb(
          breadcrumbMessage,
          'sentry-test',
          level as any,
          { endpoint: '/api/health/test-sentry', method: 'POST', testType: 'breadcrumb' }
        );

        return NextResponse.json({
          status: 'success',
          message: 'Test breadcrumb added to Sentry',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          breadcrumb: breadcrumbMessage,
        });
      }

      default:
        return NextResponse.json(
          {
            status: 'error',
            message: `Unknown test type: ${type}`,
            validTypes: ['exception', 'message', 'breadcrumb'],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    captureException(error as Error, {
      endpoint: '/api/health/test-sentry',
      method: 'POST',
      errorType: 'endpoint-error',
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Error occurred in Sentry test endpoint',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
