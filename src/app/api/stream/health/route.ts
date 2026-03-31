/**
 * SSE Health Stream API
 * Real-time health metrics via Server-Sent Events
 *
 * @openapi
 * /api/stream/health:
 *   get:
 *     summary: Stream health metrics via SSE
 *     description: Real-time health monitoring using Server-Sent Events (SSE)
 *     tags:
 *       - Monitoring
 *       - Stream
 *     responses:
 *       200:
 *         description: SSE stream established successfully
 *       400:
 *         description: Invalid SSE request
 *       503:
 *         description: Service unavailable
 */

import { NextRequest } from 'next/server';
import { performanceCollector } from '@/lib/monitoring/performance.monitor';
import { detailedHealthCheck } from '@/lib/monitoring/health';
import { getGlobalStreamManager } from '@/lib/sse/stream';
import { getSSEHeaders, isValidSSEConnection } from '@/lib/sse/utils';
import {
  createValidationError,
  createServiceUnavailableError,
  ErrorType,
} from '@/lib/api/error-handler';
import { getLocaleFromRequest } from '@/lib/api/user-messages';
import { createApiContext, logApiError, logApiSuccess } from '@/lib/api/error-logger';
import { logger } from '@/lib/logger';

/**
 * Health event data
 */
interface HealthEvent {
  type: 'metrics' | 'status' | 'alert' | 'error';
  timestamp: string;
  data: {
    apiLatency?: number;
    memoryUsage?: number;
    status?: 'ok' | 'degraded' | 'error';
    checks?: Record<string, unknown>;
    uptime?: number;
    errorMessage?: string;
    errorDetails?: unknown;
  };
}

/**
 * Custom error for SSE-related failures
 */
class SSEStreamError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SSEStreamError';
  }
}

/**
 * Safe SSE event enqueuing with error handling
 */
function safeEnqueue(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: string,
  context: { clientId: string; userId?: string }
): boolean {
  try {
    controller.enqueue(encoder.encode(data));
    return true;
  } catch (_error) {
    // Client disconnected - log and return false
    logger.warn('Failed to enqueue SSE event - client likely disconnected', {
      error: error instanceof Error ? error.message : String(error),
      clientId: context.clientId,
      userId: context.userId,
      category: 'stream',
    });
    return false;
  }
}

/**
 * Gather health metrics with enhanced error handling
 */
async function gatherHealthMetrics(): Promise<HealthEvent> {
  try {
    // Get API metrics
    const metrics = performanceCollector.getMetrics();
    const apiMetrics = metrics.get('TTFB');
    const apiLatency = apiMetrics && apiMetrics.length > 0
      ? apiMetrics[apiMetrics.length - 1].value
      : 0;

    // Get memory usage
    let memoryUsage = 0;
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory;

      if (memory) {
        memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
      }
    }

    return {
      type: 'metrics',
      timestamp: new Date().toISOString(),
      data: {
        apiLatency: Math.round(apiLatency),
        memoryUsage: Math.round(memoryUsage * 10) / 10,
      },
    };
  } catch (_error) {
    logger.error('Failed to gather health metrics', error, { category: 'health' });

    return {
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        errorMessage: 'Failed to gather health metrics',
        errorDetails: process.env.NODE_ENV === 'development'
          ? { originalError: error instanceof Error ? error.message : String(error) }
          : undefined,
      },
    };
  }
}

/**
 * Gather detailed health check with enhanced error handling
 */
async function gatherDetailedHealth(): Promise<HealthEvent> {
  try {
    const health = await detailedHealthCheck();

    return {
      type: 'status',
      timestamp: new Date().toISOString(),
      data: {
        status: health.status,
        checks: health.checks,
        uptime: health.uptime,
      },
    };
  } catch (_error) {
    logger.error('Failed to gather detailed health check', error, { category: 'health' });

    return {
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        status: 'error' as const,
        errorMessage: 'Failed to gather detailed health check',
        errorDetails: process.env.NODE_ENV === 'development'
          ? { originalError: error instanceof Error ? error.message : String(error) }
          : undefined,
      },
    };
  }
}

/**
 * Format SSE event
 */
function formatSSEEvent(
  data: unknown,
  eventType?: string,
  eventId?: string
): string {
  let event = '';

  if (eventId) {
    event += `id: ${eventId}\n`;
  }

  if (eventType) {
    event += `event: ${eventType}\n`;
  }

  event += `data: ${JSON.stringify(data)}\n\n`;

  return event;
}

/**
 * Safe interval cleanup with error handling
 */
function safeClearInterval(intervalId: NodeJS.Timeout, context: { clientId: string; intervalType: string }): void {
  try {
    clearInterval(intervalId);
    logger.debug(`Cleared ${context.intervalType} interval`, {
      clientId: context.clientId,
      category: 'stream',
    });
  } catch (_error) {
    logger.warn(`Failed to clear ${context.intervalType} interval`, {
      error: error instanceof Error ? error.message : String(error),
      clientId: context.clientId,
      category: 'stream',
    });
  }
}

/**
 * GET /api/stream/health
 * SSE endpoint for real-time health metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const locale = getLocaleFromRequest(request);
  const context = createApiContext(request);

  try {
    // Validate SSE request
    if (!isValidSSEConnection(request)) {
      const validationError = new Error('Invalid SSE connection request - requires text/event-stream accept header');
      logApiError(validationError, { ...context, requestId });
      return await createValidationError('Invalid SSE connection request - requires text/event-stream accept header', undefined, locale, requestId);
    }

    // Check stream manager availability
    let streamManager;
    try {
      streamManager = getGlobalStreamManager();
    } catch (_error) {
      const streamError = error instanceof Error ? error : new Error(String(error));
      logApiError(streamError, { ...context, requestId });
      return await createServiceUnavailableError('Streaming service temporarily unavailable', locale, requestId);
    }

    const clientId = crypto.randomUUID();
    const encoder = new TextEncoder();

    logger.info(`SSE health stream connecting: ${clientId}`, {
      requestId,
      clientId,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      category: 'stream',
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        let intervalId: NodeJS.Timeout | null = null;
        let detailedIntervalId: NodeJS.Timeout | null = null;
        let keepAliveId: NodeJS.Timeout | null = null;

        try {
          // Add client to manager
          const _client = streamManager.addClient(clientId, controller);

          // Send initial connection event
          const connectEvent: HealthEvent = {
            type: 'metrics',
            timestamp: new Date().toISOString(),
            data: {},
          };

          const connected = safeEnqueue(
            controller,
            encoder,
            formatSSEEvent(connectEvent, 'connected', clientId),
            { clientId }
          );

          if (!connected) {
            // Client disconnected immediately
            streamManager.removeClient(clientId);
            return;
          }

          // Set up periodic data push (every 5 seconds)
          intervalId = setInterval(async () => {
            try {
              const healthData = await gatherHealthMetrics();

              const enqueued = safeEnqueue(
                controller,
                encoder,
                formatSSEEvent(healthData, 'metrics'),
                { clientId }
              );

              if (!enqueued) {
                if (intervalId) safeClearInterval(intervalId, { clientId, intervalType: 'metrics' });
                if (detailedIntervalId) safeClearInterval(detailedIntervalId, { clientId, intervalType: 'detailed' });
                if (keepAliveId) safeClearInterval(keepAliveId, { clientId, intervalType: 'keepalive' });
                streamManager.removeClient(clientId);
              }
            } catch (_error) {
              logger.error('Error in health metrics interval', error, {
                clientId,
                category: 'stream',
              });

              // Send error event to client
              const errorEvent: HealthEvent = {
                type: 'error',
                timestamp: new Date().toISOString(),
                data: {
                  errorMessage: 'Error gathering health metrics',
                  errorDetails: process.env.NODE_ENV === 'development'
                    ? { originalError: error instanceof Error ? error.message : String(error) }
                    : undefined,
                },
              };

              safeEnqueue(
                controller,
                encoder,
                formatSSEEvent(errorEvent, 'error'),
                { clientId }
              );
            }
          }, 5000);

          // Set up detailed health check (every 30 seconds)
          detailedIntervalId = setInterval(async () => {
            try {
              const health = await gatherDetailedHealth();

              safeEnqueue(
                controller,
                encoder,
                formatSSEEvent(health, 'status'),
                { clientId }
              );
            } catch (_error) {
              logger.error('Error in detailed health check interval', error, {
                clientId,
                category: 'stream',
              });
            }
          }, 30000);

          // Send keep-alive every 15 seconds
          keepAliveId = setInterval(() => {
            const enqueued = safeEnqueue(
              controller,
              encoder,
              ': keep-alive\n\n',
              { clientId }
            );

            if (!enqueued) {
              if (intervalId) safeClearInterval(intervalId, { clientId, intervalType: 'metrics' });
              if (detailedIntervalId) safeClearInterval(detailedIntervalId, { clientId, intervalType: 'detailed' });
              if (keepAliveId) safeClearInterval(keepAliveId, { clientId, intervalType: 'keepalive' });
              streamManager.removeClient(clientId);
            }
          }, 15000);

          // Clean up on disconnect
          request.signal.addEventListener('abort', () => {
            logger.info(`SSE health stream disconnected: ${clientId}`, {
              clientId,
              requestId,
              category: 'stream',
            });

            if (intervalId) safeClearInterval(intervalId, { clientId, intervalType: 'metrics' });
            if (detailedIntervalId) safeClearInterval(detailedIntervalId, { clientId, intervalType: 'detailed' });
            if (keepAliveId) safeClearInterval(keepAliveId, { clientId, intervalType: 'keepalive' });
            streamManager.removeClient(clientId);
          });

        } catch (_error) {
          // Handle startup errors
          logger.error('Failed to start SSE health stream', error, {
            clientId,
            requestId,
            category: 'stream',
          });

          // Clean up any intervals that were set
          if (intervalId) safeClearInterval(intervalId, { clientId, intervalType: 'metrics' });
          if (detailedIntervalId) safeClearInterval(detailedIntervalId, { clientId, intervalType: 'detailed' });
          if (keepAliveId) safeClearInterval(keepAliveId, { clientId, intervalType: 'keepalive' });

          try {
            streamManager.removeClient(clientId);
          } catch (cleanupError) {
            logger.warn('Failed to remove client during cleanup', {
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
              clientId,
              category: 'stream',
            });
          }

          // Try to send error event to client
          const errorEvent: HealthEvent = {
            type: 'error',
            timestamp: new Date().toISOString(),
            data: {
              errorMessage: 'Failed to initialize health stream',
            },
          };

          safeEnqueue(
            controller,
            encoder,
            formatSSEEvent(errorEvent, 'error'),
            { clientId }
          );

          throw error;
        }
      },
    });

    logger.info(`SSE health stream established: ${clientId}`, {
      requestId,
      clientId,
      category: 'stream',
    });

    return new Response(stream, {
      headers: {
        ...getSSEHeaders(),
        'X-Client-ID': clientId,
        'X-Request-ID': requestId,
      },
    });

  } catch (_error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const duration = Date.now() - startTime;

    logApiError(errorObj, { ...context, requestId, duration });

    if (error instanceof SSEStreamError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            type: ErrorType.SERVICE_UNAVAILABLE,
            message: error.message,
            details: error.details,
            timestamp: new Date().toISOString(),
          },
          requestId,
        }),
        { status: error.statusCode }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          type: ErrorType.INTERNAL,
          message: 'Failed to initialize health stream',
          timestamp: new Date().toISOString(),
        },
        requestId,
      }),
      { status: 500 }
    );
  }
}
