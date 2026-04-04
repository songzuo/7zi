import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * WebSocket Hook for Real-time Execution Updates
 * 
 * Replaces HTTP polling with WebSocket for real-time execution monitoring.
 * 
 * Features:
 * - Automatic reconnection
 * - Heartbeat/ping-pong
 * - Event-based updates
 * - Connection status tracking
 * - Error handling
 * 
 * @example
 * const { execution, connected, error } = useExecutionWebSocket(executionId);
 * 
 * if (!connected) return <div>Connecting...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return <div>Status: {execution.status}</div>;
 */

interface ExecutionStatus {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  nodeExecutions: NodeExecution[];
  variables: Record<string, any>;
  checkpoints?: Array<{
    id: string;
    nodeId: string;
    timestamp: string;
    data?: Record<string, any>;
  }>;
  error?: {
    message: string;
    code?: string;
    timestamp: string;
  };
}

interface NodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: string;
  endTime?: string;
  input?: any;
  output?: any;
  retryCount: number;
  error?: {
    message: string;
    timestamp: string;
  };
}

interface WebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'state' | 'event' | 'error' | 'pong' | 'subscriptions';
  event?: string;
  data?: any;
  clientId?: string;
  timestamp?: string;
  error?: {
    message: string;
    code?: string;
  };
}

interface UseExecutionWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onEvent?: (event: string, data: any) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseExecutionWebSocketReturn {
  execution: ExecutionStatus | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  clientId: string | null;
  subscribe: (executionId: string) => void;
  unsubscribe: () => void;
  reconnect: () => void;
}

export function useExecutionWebSocket(
  executionId: string | null,
  options: UseExecutionWebSocketOptions = {}
): UseExecutionWebSocketReturn {
  const {
    autoReconnect = true,
    reconnectInterval = 5000,
    heartbeatInterval = 30000,
    onEvent,
    onError,
    onConnect,
    onDisconnect
  } = options;

  // State
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mountedRef = useRef<boolean>(true);

  /**
   * Start heartbeat/ping interval
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  /**
   * Stop heartbeat
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = undefined;
    }
  }, []);

  /**
   * Handle WebSocket message
   */
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connected':
        setClientId(message.clientId || null);
        console.log('[WebSocket] Connected with client ID:', message.clientId);
        break;

      case 'subscribed':
        console.log('[WebSocket] Subscribed to execution:', executionId);
        break;

      case 'state':
        // Full state update
        if (message.data) {
          setExecution(message.data);
          console.log('[WebSocket] Received execution state');
        }
        break;

      case 'event':
        // Incremental event update
        if (message.event && message.data) {
          setExecution(prev => {
            if (!prev) return message.data.execution || null;
            
            // Merge event data with existing state
            const updated = { ...prev };
            
            // Handle different event types
            switch (message.event) {
              case 'execution:completed':
              case 'execution:failed':
              case 'execution:cancelled':
              case 'execution:paused':
              case 'execution:resumed':
                Object.assign(updated, message.data.execution || message.data);
                break;
                
              case 'node:started':
              case 'node:completed':
              case 'node:failed':
                // Update node execution
                const nodeData = message.data;
                if (nodeData.node && nodeData.execution) {
                  const nodeIdx = updated.nodeExecutions.findIndex(
                    n => n.nodeId === nodeData.node.id
                  );
                  if (nodeIdx >= 0) {
                    updated.nodeExecutions[nodeIdx] = {
                      ...updated.nodeExecutions[nodeIdx],
                      ...nodeData.execution
                    };
                  } else {
                    updated.nodeExecutions.push(nodeData.execution);
                  }
                }
                break;
                
              case 'checkpoint:created':
                // Add checkpoint
                if (message.data.checkpoint) {
                  updated.checkpoints = updated.checkpoints || [];
                  updated.checkpoints.push(message.data.checkpoint);
                }
                break;
            }
            
            return updated;
          });
          
          // Call event callback
          if (onEvent) {
            onEvent(message.event, message.data);
          }
        }
        break;

      case 'pong':
        // Heartbeat response
        break;

      case 'error':
        const errorMsg = message.error?.message || 'Unknown error';
        console.error('[WebSocket] Error:', errorMsg);
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
        break;
    }
  }, [executionId, onEvent, onError]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!executionId || !mountedRef.current) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnecting(true);
    setError(null);

    try {
      // Create WebSocket connection
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        console.log('[WebSocket] Connection opened');
        setConnected(true);
        setConnecting(false);
        setError(null);
        
        // Subscribe to execution
        ws.send(JSON.stringify({
          type: 'subscribe',
          executionId,
          events: ['execution:*', 'node:*', 'checkpoint:*']
        }));
        
        // Start heartbeat
        startHeartbeat();
        
        if (onConnect) {
          onConnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        if (!mountedRef.current) return;
        
        setError('WebSocket connection error');
        setConnecting(false);
        
        if (onError) {
          onError('WebSocket connection error');
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.reason);
        if (!mountedRef.current) return;
        
        setConnected(false);
        setConnecting(false);
        stopHeartbeat();
        
        if (onDisconnect) {
          onDisconnect();
        }
        
        // Auto reconnect
        if (autoReconnect && event.code !== 1000) {
          console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current && executionId) {
              connect();
            }
          }, reconnectInterval);
        }
      };
    } catch (err: any) {
      console.error('[WebSocket] Failed to create connection:', err);
      setError(err.message);
      setConnecting(false);
    }
  }, [executionId, autoReconnect, reconnectInterval, startHeartbeat, stopHeartbeat, handleMessage, onConnect, onDisconnect, onError]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
  }, [stopHeartbeat]);

  /**
   * Subscribe to execution
   */
  const subscribe = useCallback((newExecutionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        executionId: newExecutionId,
        events: ['execution:*', 'node:*', 'checkpoint:*']
      }));
    }
  }, []);

  /**
   * Unsubscribe from execution
   */
  const unsubscribe = useCallback(() => {
    if (executionId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        executionId
      }));
    }
  }, [executionId]);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 100) as unknown as NodeJS.Timeout;
  }, [disconnect, connect]);

  // Effect: Connect on mount
  useEffect(() => {
    mountedRef.current = true;
    
    if (executionId) {
      connect();
    }
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [executionId]); // Reconnect if executionId changes

  // Effect: Update subscription when executionId changes
  useEffect(() => {
    if (connected && executionId) {
      subscribe(executionId);
    }
  }, [executionId, connected, subscribe]);

  return {
    execution,
    connected,
    connecting,
    error,
    clientId,
    subscribe,
    unsubscribe,
    reconnect
  };
}

/**
 * Fallback: HTTP Polling Hook
 * Use when WebSocket is not available
 */
export function useExecutionPolling(
  executionId: string | null,
  interval: number = 2000
): UseExecutionWebSocketReturn {
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!executionId) return;
    
    let intervalId: NodeJS.Timeout;
    let mounted = true;
    
    const fetchExecution = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}`);
        if (!response.ok) throw new Error('Failed to fetch execution');
        
        const data = await response.json();
        
        if (mounted) {
          setExecution(data.data);
          setError(null);
          
          // Stop polling if execution is finished
          if (['completed', 'failed', 'cancelled'].includes(data.data.status)) {
            clearInterval(intervalId);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
        }
      }
    };
    
    fetchExecution();
    intervalId = setInterval(fetchExecution, interval);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [executionId, interval]);
  
  return {
    execution,
    connected: true,
    connecting: false,
    error,
    clientId: null,
    subscribe: () => {},
    unsubscribe: () => {},
    reconnect: () => {}
  };
}

/**
 * Smart Hook: Auto-select WebSocket or Polling
 */
export function useExecution(
  executionId: string | null,
  preferWebSocket: boolean = true
): UseExecutionWebSocketReturn {
  const supportsWebSocket = typeof WebSocket !== 'undefined' && preferWebSocket;
  
  const wsResult = useExecutionWebSocket(executionId);
  const pollResult = useExecutionPolling(executionId);
  
  // Use WebSocket if available, otherwise fallback to polling
  if (supportsWebSocket && !wsResult.error) {
    return wsResult;
  }
  
  return pollResult;
}

export default useExecutionWebSocket;
