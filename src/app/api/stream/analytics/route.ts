/**
 * SSE Analytics Stream API
 * Real-time analytics metrics via Server-Sent Events (requires authentication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalStreamManager } from '@/lib/sse/stream';
import { getSSEHeaders, isValidSSEConnection } from '@/lib/sse/utils';
import { createValidationError } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';
import { withUserAuth, RBACUserContext } from '@/lib/auth/middleware-rbac';

/**
 * Analytics event data
 */
interface AnalyticsEvent {
  type: 'metrics' | 'analytics' | 'alert';
  timestamp: string;
  data: unknown;
}

/**
 * Simulated performance metrics generator
 */
function generatePerformanceMetrics() {
  return [
    {
      name: 'CPU 使用率',
      value: Math.floor(Math.random() * 30) + 40,
      unit: '%',
      trend: Math.random() > 0.5 ? 'up' : 'down',
      change: Math.random() * 10 - 5
    },
    {
      name: '内存使用',
      value: Math.floor(Math.random() * 20) + 60,
      unit: '%',
      trend: 'stable',
      change: 0,
      target: 80
    },
    {
      name: '响应时间',
      value: Math.floor(Math.random() * 50) + 100,
      unit: 'ms',
      trend: Math.random() > 0.5 ? 'down' : 'up',
      change: Math.random() * 20 - 10,
      target: 200
    },
    {
      name: '任务完成率',
      value: Math.floor(Math.random() * 15) + 80,
      unit: '%',
      trend: 'up',
      change: Math.random() * 5,
      target: 95
    }
  ];
}

/**
 * GET /api/stream/analytics
 * SSE endpoint for real-time analytics metrics (requires authentication)
 */
async function GETHandler(
  request: NextRequest,
  context: RBACUserContext
): Promise<NextResponse> {
  // Validate SSE request
  if (!isValidSSEConnection(request)) {
    logger.warn('Invalid SSE connection attempt', { userId: context.userId });
    return createValidationError('Invalid SSE connection request');
  }

  const streamManager = getGlobalStreamManager();
  const clientId = crypto.randomUUID();

  logger.info(`SSE analytics stream opened: ${clientId}`, {
    userId: context.userId,
    clientId,
  });

  // Create a readable stream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add client to manager
      const client = streamManager.addClient(clientId, controller);

      // Send initial connection event
      const connectEvent: AnalyticsEvent = {
        type: 'metrics',
        timestamp: new Date().toISOString(),
        data: generatePerformanceMetrics(),
      };

      try {
        controller.enqueue(
          encoder.encode(formatSSEEvent(connectEvent, 'connected', clientId))
        );
      } catch (error) {
        // Client disconnected - silently fail
      }

      // Set up periodic data push (every 5 seconds)
      const intervalId = setInterval(async () => {
        const metricsData = {
          type: 'metrics',
          timestamp: new Date().toISOString(),
          data: generatePerformanceMetrics(),
        };

        try {
          controller.enqueue(
            encoder.encode(formatSSEEvent(metricsData, 'metrics'))
          );
        } catch (error) {
          clearInterval(intervalId);
          streamManager.removeClient(clientId);
        }
      }, 5000);

      // Send keep-alive every 15 seconds
      const keepAliveId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          // Client disconnected - silently fail
        }
      }, 15000);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        clearInterval(keepAliveId);
        streamManager.removeClient(clientId);

        logger.info(`SSE analytics stream closed: ${clientId}`, {
          userId: context.userId,
          clientId,
        });
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      ...getSSEHeaders(),
      'X-Client-ID': clientId,
    },
  });
}

export async function GET(request: NextRequest) {
  return withUserAuth(request, GETHandler);
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
