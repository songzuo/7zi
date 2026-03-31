/**
 * SSE Hooks
 * React hooks for Server-Sent Events
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * SSE connection state
 */
export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * SSE connection state
 */
export interface SSEState<T = unknown> {
  state: SSEConnectionState;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  data: string | null;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * SSE hook options
 */
export interface SSEOptions<T> {
  enabled?: boolean;
  onMessage?: (data: T) => void;
  onOpen?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Generic SSE hook for custom endpoints
 */
export function useSSE<T = unknown>(
  url: string,
  options: SSEOptions<T> = {}
): SSEState<T> {
  const { enabled = true, onMessage, onOpen, onError } = options;
  const [sseState, setSSEState] = useState<SSEState<T>>(() => ({
    state: 'disconnected',
    isConnected: false,
    isLoading: false,
    error: null,
    data: null,
    disconnect: () => {},
    reconnect: () => {},
  }));
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setSSEState((prev) => ({ ...prev, state: 'disconnected', isConnected: false }));
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setSSEState((prev) => ({ ...prev, state: 'connecting', isLoading: true, error: null }));
  }, [disconnect]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

     
    setSSEState((prev) => ({ ...prev, state: 'connecting', isLoading: true }));

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setSSEState((prev) => ({ ...prev, state: 'connected', isConnected: true, isLoading: false, error: null }));
      onOpen?.();
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        setSSEState((prev) => ({ ...prev, data: JSON.stringify(parsed, null, 2) }));
        onMessage?.(parsed);
      } catch {
        // If not JSON, pass the raw data as string
        setSSEState((prev) => ({ ...prev, data: event.data }));
        onMessage?.(event.data as unknown as T);
      }
    };

    eventSource.onerror = () => {
      const error = new Error('SSE connection error');
      setSSEState((prev) => ({ ...prev, state: 'error', isConnected: false, isLoading: false, error }));
      onError?.(error);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, enabled, onMessage, onOpen, onError]);

  return {
    ...sseState,
    disconnect,
    reconnect,
  };
}

/**
 * Health SSE hook
 * Monitors application health via SSE
 */
export function useHealthSSE(enabled: boolean = true): SSEState & { health: Record<string, unknown> | null } {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  const handleMessage = useCallback((data: Record<string, unknown>) => {
    setHealth(data);
  }, []);

  const state = useSSE<Record<string, unknown>>('/api/health/stream', {
    enabled,
    onMessage: handleMessage,
  });

  return {
    ...state,
    health,
  };
}
