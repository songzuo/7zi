/**
 * SSE Utility Functions
 * Helper functions for Server-Sent Events
 */

/**
 * Create SSE headers
 */
export function getSSEHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  };
}

/**
 * Format SSE event
 */
export function formatSSEEvent(
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
 * Parse SSE message
 */
export function parseSSEMessage(
  message: string
): { event?: string; id?: string; data: unknown } | null {
  const lines = message.split('\n').filter((line) => line.trim());
  const result: { event?: string; id?: string; data: unknown } = {
    data: null,
  };

  for (const line of lines) {
    const [field, value] = line.split(': ', 2) as [string, string];

    switch (field) {
      case 'event':
        result.event = value;
        break;
      case 'id':
        result.id = value;
        break;
      case 'data':
        try {
          result.data = JSON.parse(value);
        } catch {
          result.data = value;
        }
        break;
    }
  }

  if (!result.data) {
    return null;
  }

  return result;
}

/**
 * Validate SSE connection
 */
export function isValidSSEConnection(request: Request): boolean {
  const accept = request.headers.get('accept');
  return accept?.includes('text/event-stream') ?? false;
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}
