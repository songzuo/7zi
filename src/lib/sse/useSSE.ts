/**
 * useSSE Hook
 * React hook for consuming Server-Sent Events
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * SSE event handler
 */
type SSEEventHandler<T = unknown> = (data: T) => void;

/**
 * SSE connection state
 */
type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * useSSE options
 */
interface UseSSEOptions<T = unknown> {
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: SSEEventHandler<T>;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  lastEventId?: string;
}

/**
 * SSE return value
 */
interface UseSSEReturn<T = unknown> {
  data: T | null;
  state: SSEConnectionState;
  error: Event | null;
  lastEventId: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * useSSE Hook
 * @param url - SSE endpoint URL
 * @param options - Configuration options
 * @returns SSE connection state and data
 */
export function useSSE<T = unknown>(
  url: string,
  options: UseSSEOptions<T> = {}
): UseSSEReturn<T> {
  const {
    enabled = true,
    reconnect = true,
    reconnectInterval = 3000,
    onMessage,
    onError,
    onOpen,
    onClose,
    lastEventId: initialLastEventId,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<Event | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(
    initialLastEventId || null
  );

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enabledRef = useRef(enabled);
  const connectRef = useRef<(() => void) | null>(null);

  // Keep enabled ref in sync
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    if (!enabledRef.current) {
      return;
    }

    cleanup();
    setState('connecting');
    setError(null);

    try {
      // Build URL with lastEventId if available
      const eventSourceUrl = lastEventId
        ? `${url}?lastEventId=${encodeURIComponent(lastEventId)}`
        : url;

      const eventSource = new EventSource(eventSourceUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState('connected');
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          setData(parsed);
          onMessage?.(parsed);

          // Update last event ID if provided
          if (event.lastEventId) {
            setLastEventId(event.lastEventId);
          }
        } catch (error) {
          // Invalid JSON - silently ignore
        }
      };

      eventSource.onerror = (err) => {
        setError(err);
        setState('error');
        onError?.(err);

        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect if enabled
        if (reconnect && enabledRef.current) {
          setState('connecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current?.();
          }, reconnectInterval);
        } else {
          setState('disconnected');
        }
      };
    } catch (err) {
      const error = err as Error;
      setError(error as unknown as Event);
      setState('error');
      onError?.(error as unknown as Event);
    }
  }, [url, reconnect, reconnectInterval, lastEventId, onMessage, onError, onOpen, cleanup]);

  // Update connect ref
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Manual reconnect
  const manualReconnect = useCallback(() => {
    setLastEventId(null); // Reset last event ID on manual reconnect
    connect();
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    setState('disconnected');
    onClose?.();
  }, [cleanup, onClose]);

  // Connect on mount and when URL changes
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [enabled, url]); // Only reconnect when URL or enabled changes

  return {
    data,
    state,
    error,
    lastEventId,
    reconnect: manualReconnect,
    disconnect,
  };
}

/**
 * useHealthSSE Hook
 * Specialized hook for health metrics
 */
export function useHealthSSE(enabled = true) {
  return useSSE<{
    type: 'metrics' | 'status' | 'alert';
    timestamp: string;
    data: {
      apiLatency?: number;
      memoryUsage?: number;
      status?: 'ok' | 'degraded' | 'error';
      checks?: Record<string, unknown>;
      uptime?: number;
    };
  }>('/api/stream/health', {
    enabled,
    reconnect: true,
    reconnectInterval: 3000,
  });
}
