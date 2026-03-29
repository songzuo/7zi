/**
 * useWebSocketStatus Hook
 *
 * React hook for tracking WebSocket connection status and statistics
 * Provides optimized access to connection state and stats with minimal re-renders
 *
 * Features:
 * - Efficient state management with memoization
 * - Automatic cleanup
 * - Connection state and statistics tracking
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  WebSocketManager,
  ConnectionState,
  ConnectionStats,
  type WebSocketManagerOptions,
} from '@/lib/websocket-manager';

/**
 * Hook options
 */
export interface UseWebSocketStatusOptions {
  updateInterval?: number; // Stats update interval in ms (default: 1000)
  enabled?: boolean; // Whether to track stats (default: true)
}

/**
 * Hook options for auto mode
 */
export interface UseWebSocketStatusAutoOptions extends UseWebSocketStatusOptions {
  managerOptions?: Partial<Omit<WebSocketManagerOptions, 'url'>>;
}

/**
 * Hook return value
 */
export interface UseWebSocketStatusReturn {
  // Connection state
  state: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  isError: boolean;

  // Statistics
  stats: ConnectionStats;

  // Queue
  queueSize: number;

  // Actions
  getManager: () => WebSocketManager | null;
  connect: () => void;
  disconnect: () => void;
  resetStats: () => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseWebSocketStatusOptions> = {
  updateInterval: 1000,
  enabled: true,
};

/**
 * useWebSocketStatus Hook
 */
export function useWebSocketStatus(
  wsManager: WebSocketManager | null,
  options: UseWebSocketStatusOptions = {}
): UseWebSocketStatusReturn {
  const { updateInterval, enabled } = { ...DEFAULT_OPTIONS, ...options };

  // State
  const [state, setState] = useState<ConnectionState>(
    wsManager?.getState() ?? ConnectionState.DISCONNECTED
  );
  const [stats, setStats] = useState<ConnectionStats>(
    wsManager?.getStats() ??
      ({
        messagesSent: 0,
        messagesReceived: 0,
        totalReconnections: 0,
        lastActiveTime: Date.now(),
        lastPingTime: 0,
        currentPingLatency: 0,
        averagePingLatency: 0,
      } as ConnectionStats)
  );
  const [queueSize, setQueueSize] = useState(wsManager?.getQueueSize() ?? 0);

  /**
   * Subscribe to connection state changes
   */
  useEffect(() => {
    if (!wsManager) return;

    const handleStateChange = (newState: ConnectionState) => {
      setState(newState);
    };

    wsManager.onStateChange(handleStateChange);

    return () => {
      wsManager.offStateChange(handleStateChange);
    };
  }, [wsManager]);

  /**
   * Periodic stats update
   */
  useEffect(() => {
    if (!wsManager || !enabled) return;

    const updateStats = () => {
      setStats(wsManager.getStats());
      setQueueSize(wsManager.getQueueSize());
    };

    const interval = setInterval(updateStats, updateInterval);

    return () => clearInterval(interval);
  }, [wsManager, updateInterval, enabled]);

  /**
   * Connect action
   */
  const connect = useCallback(() => {
    wsManager?.connect();
  }, [wsManager]);

  /**
   * Disconnect action
   */
  const disconnect = useCallback(() => {
    wsManager?.disconnect();
  }, [wsManager]);

  /**
   * Reset statistics
   */
  const resetStats = useCallback(() => {
    wsManager?.resetStats();
    setStats(wsManager?.getStats() ?? {
      messagesSent: 0,
      messagesReceived: 0,
      totalReconnections: 0,
      lastActiveTime: Date.now(),
      lastPingTime: 0,
      currentPingLatency: 0,
      averagePingLatency: 0,
    } as ConnectionStats);
  }, [wsManager]);

  /**
   * Get manager instance
   */
  const getManager = useCallback(() => wsManager, [wsManager]);

  return {
    // Connection state
    state,
    isConnected: state === ConnectionState.CONNECTED,
    isConnecting: state === ConnectionState.CONNECTING,
    isReconnecting: state === ConnectionState.RECONNECTING,
    isError: state === ConnectionState.ERROR,

    // Statistics
    stats,

    // Queue
    queueSize,

    // Actions
    getManager,
    connect,
    disconnect,
    resetStats,
  };
}

/**
 * useWebSocketStatus with automatic manager creation
 *
 * Creates and manages a WebSocketManager instance automatically
 *
 * @param socketUrl - WebSocket server URL
 * @param options - Hook and manager options
 */
export function useWebSocketStatusAuto(
  socketUrl: string,
  options: UseWebSocketStatusAutoOptions = {}
): UseWebSocketStatusReturn {
  const { managerOptions, ...hookOptions } = options;

  // Create manager on mount
  const [manager] = useState(() => {
    return new WebSocketManager({
      url: socketUrl,
      ...managerOptions,
    });
  });

  const status = useWebSocketStatus(manager, hookOptions);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      manager.disconnect();
    };
  }, [manager]);

  return status;
}
