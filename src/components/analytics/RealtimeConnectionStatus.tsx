/**
 * RealtimeConnectionStatus Component
 * WebSocket 连接状态实时显示组件
 *
 * 实时显示 WebSocket 连接状态、延迟、消息统计等信息
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import type { WebSocketConnectionMetrics } from '@/lib/types/analytics/realtime';
import type { WebSocketStatus } from '@/lib/types/analytics/realtime';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealtimeConnectionStatusProps {
  connection: WebSocketConnectionMetrics;
  onRefresh?: () => void;
  onReconnect?: () => void;
  showDetails?: boolean;
  locale?: string;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusColor(status: WebSocketStatus): string {
  switch (status) {
    case 'connected':
      return 'text-green-600 dark:text-green-400';
    case 'connecting':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'disconnected':
      return 'text-zinc-500 dark:text-zinc-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'reconnecting':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-zinc-500 dark:text-zinc-400';
  }
}

function getStatusBgColor(status: WebSocketStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
    case 'connecting':
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    case 'disconnected':
      return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700';
    case 'error':
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    case 'reconnecting':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
    default:
      return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700';
  }
}

function getStatusIcon(status: WebSocketStatus) {
  switch (status) {
    case 'connected':
      return <Wifi className="w-5 h-5" />;
    case 'connecting':
    case 'reconnecting':
      return <RefreshCw className="w-5 h-5 animate-spin" />;
    case 'disconnected':
      return <WifiOff className="w-5 h-5" />;
    case 'error':
      return <AlertTriangle className="w-5 h-5" />;
    default:
      return <WifiOff className="w-5 h-5" />;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// ============================================================================
// Main Component
// ============================================================================

export const RealtimeConnectionStatus: React.FC<RealtimeConnectionStatusProps> = ({
  connection,
  onRefresh,
  onReconnect,
  showDetails = true,
  locale = 'en',
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time periodically for duration calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second for real-time duration display
    return () => clearInterval(interval);
  }, []);

  const t = {
    status: locale === 'zh' ? '状态' : 'Status',
    connected: locale === 'zh' ? '已连接' : 'Connected',
    connecting: locale === 'zh' ? '连接中' : 'Connecting',
    disconnected: locale === 'zh' ? '已断开' : 'Disconnected',
    error: locale === 'zh' ? '错误' : 'Error',
    reconnecting: locale === 'zh' ? '重连中' : 'Reconnecting',
    latency: locale === 'zh' ? '延迟' : 'Latency',
    refresh: locale === 'zh' ? '刷新' : 'Refresh',
    reconnect: locale === 'zh' ? '重新连接' : 'Reconnect',
    messagesReceived: locale === 'zh' ? '接收消息' : 'Messages Received',
    messagesSent: locale === 'zh' ? '发送消息' : 'Messages Sent',
    connectedAt: locale === 'zh' ? '连接时间' : 'Connected At',
    lastPing: locale === 'zh' ? '最后心跳' : 'Last Ping',
    reconnectAttempts: locale === 'zh' ? '重连尝试' : 'Reconnect Attempts',
    connectionTime: locale === 'zh' ? '连接时长' : 'Connection Time'
  };

  const statusColor = getStatusColor(connection.status);
  const statusBgColor = getStatusBgColor(connection.status);
  const statusIcon = getStatusIcon(connection.status);

  // Calculate connection duration using state
  const connectionDuration = connection.connectedAt
    ? currentTime - new Date(connection.connectedAt).getTime()
    : null;

  // Get status text
  const getStatusText = (status: WebSocketStatus): string => {
    switch (status) {
      case 'connected':
        return t.connected;
      case 'connecting':
        return t.connecting;
      case 'disconnected':
        return t.disconnected;
      case 'error':
        return t.error;
      case 'reconnecting':
        return t.reconnecting;
      default:
        return t.disconnected;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status Badge */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${statusBgColor}`}>
        <div className="flex items-center gap-3">
          <div className={`${statusColor}`}>
            {statusIcon}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {t.status}: <span className={`${statusColor} font-semibold`}>{getStatusText(connection.status)}</span>
            </p>
            {connection.latency !== undefined && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {t.latency}: <span className="font-semibold">{connection.latency}ms</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && connection.status === 'connected' && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
              title={t.refresh}
            >
              <RefreshCw className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          )}
          {onReconnect && connection.status !== 'connected' && (
            <button
              onClick={onReconnect}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              {t.reconnect}
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {connection.lastError && connection.status === 'error' && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{connection.lastError}</p>
        </div>
      )}

      {/* Details Panel */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3 p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.messagesReceived}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {connection.messagesReceived.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.messagesSent}</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {connection.messagesSent.toLocaleString()}
              </p>
            </div>
          </div>

          {connection.connectedAt && (
            <>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-zinc-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.connectedAt}</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {new Date(connection.connectedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {connectionDuration !== null && (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.connectionTime}</p>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                      {formatDuration(connectionDuration)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {connection.lastPing && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.lastPing}</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {new Date(connection.lastPing).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {connection.reconnectAttempts > 0 && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.reconnectAttempts}</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {connection.reconnectAttempts}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealtimeConnectionStatus;
