/**
 * useRealtimeAnalytics Hook
 * 实时数据分析 WebSocket Hook
 *
 * 提供实时性能指标、任务状态分布和团队效率数据的 WebSocket 连接和状态管理
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  RealtimeAnalyticsState,
  WebSocketConnectionMetrics,
  TaskStatusDistribution,
  TeamEfficiencyMetrics,
  RealtimePerformanceMetrics,
  RealtimeUpdateMessage,
  RealtimeWebSocketConfig
} from '@/lib/types/analytics/realtime';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: RealtimeWebSocketConfig = {
  url: process.env.NEXT_PUBLIC_REALTIME_WS_URL || 'ws://localhost:3001',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  enabledMetrics: ['connection', 'task_distribution', 'team_efficiency', 'performance']
};

const MAX_HISTORY_POINTS = 100;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRealtimeAnalytics(config?: Partial<RealtimeWebSocketConfig>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Connection state
  const [connection, setConnection] = useState<WebSocketConnectionMetrics>({
    status: 'disconnected',
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0
  });

  // Real-time data state
  const [taskDistribution, setTaskDistribution] = useState<TaskStatusDistribution | null>(null);
  const [teamEfficiency, setTeamEfficiency] = useState<TeamEfficiencyMetrics | null>(null);
  const [performance, setPerformance] = useState<RealtimePerformanceMetrics | null>(null);

  // History for charts
  const [history, setHistory] = useState<{
    taskStatus: Array<TaskStatusDistribution['statuses'] & { timestamp: string }>;
    efficiency: TeamEfficiencyMetrics[];
  }>({
    taskStatus: [],
    efficiency: []
  });

  // Refs for WebSocket and intervals
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latencyStartRef = useRef<number | null>(null);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnection(prev => ({
      ...prev,
      status: 'connecting',
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    try {
      const ws = new WebSocket(finalConfig.url);

      wsRef.current = ws;

      // Connection opened
      ws.onopen = () => {
        const now = new Date().toISOString();
        setConnection(prev => ({
          ...prev,
          status: 'connected',
          connectedAt: now,
          reconnectAttempts: 0,
          lastError: undefined
        }));

        // Subscribe to metrics
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            metrics: finalConfig.enabledMetrics
          })
        );
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const message: RealtimeUpdateMessage = JSON.parse(event.data);

          setConnection(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastPing: message.timestamp
          }));

          // Update latency if we have a ping-pong
          if (latencyStartRef.current) {
            const latency = Date.now() - latencyStartRef.current;
            setConnection(prev => ({ ...prev, latency }));
            latencyStartRef.current = null;
          }

          // Process message based on type
          switch (message.type) {
            case 'task_status_update':
              const taskData = message.data as TaskStatusDistribution;
              setTaskDistribution(taskData);
              setHistory(prev => ({
                ...prev,
                taskStatus: [
                  ...prev.taskStatus,
                  { ...taskData.statuses, timestamp: taskData.timestamp }
                ].slice(-MAX_HISTORY_POINTS)
              }));
              break;

            case 'efficiency_update':
              const efficiencyData = message.data as TeamEfficiencyMetrics;
              setTeamEfficiency(efficiencyData);
              setHistory(prev => ({
                ...prev,
                efficiency: [...prev.efficiency, efficiencyData].slice(-MAX_HISTORY_POINTS)
              }));
              break;

            case 'performance_update':
              setPerformance(message.data as RealtimePerformanceMetrics);
              break;

            case 'metrics_update':
              // Combined metrics update
              const metrics = message.data;
              if ('statuses' in metrics) {
                const td = metrics as TaskStatusDistribution;
                setTaskDistribution(td);
                setHistory(prev => ({
                  ...prev,
                  taskStatus: [
                    ...prev.taskStatus,
                    { ...td.statuses, timestamp: td.timestamp }
                  ].slice(-MAX_HISTORY_POINTS)
                }));
              }
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Connection closed
      ws.onclose = () => {
        setConnection(prev => ({ ...prev, status: 'disconnected' }));

        // Auto-reconnect if we haven't exceeded max attempts
        if (connection.reconnectAttempts < (finalConfig.maxReconnectAttempts || 10)) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, finalConfig.reconnectInterval);
        }
      };

      // Error occurred
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnection(prev => ({
          ...prev,
          status: 'error',
          lastError: 'Connection error occurred'
        }));
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnection(prev => ({
        ...prev,
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [finalConfig, connection.reconnectAttempts]);

  // ============================================================================
  // Disconnection
  // ============================================================================

  const disconnect = useCallback(() => {
    // Clear intervals
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnection(prev => ({
      ...prev,
      status: 'disconnected'
    }));
  }, []);

  // ============================================================================
  // Manual Refresh
  // ============================================================================

  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const now = new Date().toISOString();
      wsRef.current.send(
        JSON.stringify({
          type: 'refresh',
          timestamp: now
        })
      );
      setConnection(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1
      }));
    }
  }, []);

  // ============================================================================
  // Latency Check
  // ============================================================================

  const checkLatency = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      latencyStartRef.current = Date.now();
      wsRef.current.send(
        JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        })
      );
      setConnection(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1
      }));
    }
  }, []);

  // ============================================================================
  // Initialize Connection
  // ============================================================================

  useEffect(() => {
    connect();

    // Set up heartbeat
    heartbeatRef.current = setInterval(() => {
      checkLatency();
    }, finalConfig.heartbeatInterval);

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, checkLatency, finalConfig.heartbeatInterval]);

  // ============================================================================
  // Return State and Methods
  // ============================================================================

  return {
    // Connection state
    connection,

    // Real-time data
    taskDistribution,
    teamEfficiency,
    performance,
    history,

    // Methods
    connect,
    disconnect,
    refresh,
    checkLatency,

    // Computed values
    isConnected: connection.status === 'connected',
    isConnecting: connection.status === 'connecting',
    hasError: connection.status === 'error'
  };
}

export default useRealtimeAnalytics;
