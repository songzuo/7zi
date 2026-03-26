/**
 * RealtimeMetricsDashboard Component
 * 实时性能指标仪表盘主组件
 *
 * 整合 WebSocket 连接状态、任务状态分布、团队效率等实时指标
 */

'use client';

import React from 'react';
import { Activity, Wifi } from 'lucide-react';
import { useRealtimeAnalytics } from '@/lib/hooks/useRealtimeAnalytics';
import { RealtimeConnectionStatus } from './RealtimeConnectionStatus';
import { RealtimeTaskStatusChart } from './RealtimeTaskStatusChart';
import { RealtimeTeamEfficiency } from './RealtimeTeamEfficiency';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealtimeMetricsDashboardProps {
  enabled?: boolean;
  showConnectionStatus?: boolean;
  showTaskStatus?: boolean;
  showTeamEfficiency?: boolean;
  locale?: string;
  refreshInterval?: number;
  wsConfig?: {
    url?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    heartbeatInterval?: number;
  };
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const RealtimeMetricsDashboard: React.FC<RealtimeMetricsDashboardProps> = ({
  enabled = true,
  showConnectionStatus = true,
  showTaskStatus = true,
  showTeamEfficiency = true,
  locale = 'en',
  refreshInterval,
  wsConfig,
  className = ''
}) => {
  // Use real-time analytics hook
  const {
    connection,
    taskDistribution,
    teamEfficiency,
    performance,
    connect,
    disconnect,
    refresh,
    checkLatency,
    isConnected,
    isConnecting,
    hasError
  } = useRealtimeAnalytics(wsConfig);

  // Disable hook if not enabled
  if (!enabled) {
    return null;
  }

  const t = {
    title: locale === 'zh' ? '实时性能指标' : 'Real-time Performance Metrics',
    subtitle: locale === 'zh' ? '实时监控系统性能和任务状态' : 'Monitor system performance and task status in real-time',
    disabled: locale === 'zh' ? '实时功能已禁用' : 'Real-time features disabled'
  };

  // If connecting
  if (isConnecting && !connection.connectedAt) {
    return (
      <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="w-12 h-12 text-zinc-400 animate-pulse mx-auto mb-4" />
            <p className="text-lg font-medium text-zinc-900 dark:text-white">{locale === 'zh' ? '正在连接...' : 'Connecting...'}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">{locale === 'zh' ? '请稍候' : 'Please wait'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Wifi className="w-6 h-6" />
              {t.title}
            </h2>
            <p className="text-purple-100 dark:text-blue-100 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-500 text-white'
                : hasError
                ? 'bg-red-500 text-white'
                : 'bg-yellow-500 text-white'
            }`}>
              {isConnected
                ? (locale === 'zh' ? '已连接' : 'Connected')
                : hasError
                ? (locale === 'zh' ? '连接错误' : 'Connection Error')
                : (locale === 'zh' ? '离线' : 'Offline')
              }
            </div>
            {connection.latency !== undefined && (
              <div className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-medium">
                {connection.latency}ms
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {showConnectionStatus && (
        <RealtimeConnectionStatus
          connection={connection}
          onRefresh={refresh}
          onReconnect={connect}
          showDetails={isConnected}
          locale={locale}
        />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        {showTaskStatus && (
          <div>
            <RealtimeTaskStatusChart
              distribution={taskDistribution}
              showHistory={false}
              showChanges={true}
              locale={locale}
              height={350}
            />
          </div>
        )}

        {/* Team Efficiency */}
        {showTeamEfficiency && (
          <div>
            <RealtimeTeamEfficiency
              metrics={teamEfficiency}
              showDetails={true}
              locale={locale}
            />
          </div>
        )}
      </div>

      {/* Performance Metrics (Optional - can be shown when available) */}
      {performance && showTeamEfficiency && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            {locale === 'zh' ? '系统性能' : 'System Performance'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {locale === 'zh' ? 'CPU 使用率' : 'CPU Usage'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {performance.cpuUsage.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {locale === 'zh' ? '内存使用率' : 'Memory Usage'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {performance.memoryUsage.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {locale === 'zh' ? '请求/秒' : 'Requests/sec'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {performance.requestsPerSecond.toFixed(0)}
              </p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                {locale === 'zh' ? '错误率' : 'Error Rate'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {performance.errorRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {connection.connectedAt && (
        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          {locale === 'zh' ? '实时数据通过 WebSocket 推送，延迟' : 'Real-time data streamed via WebSocket, latency'}{' '}
          <span className="font-semibold text-zinc-900 dark:text-white">
            {connection.latency !== undefined ? `${connection.latency}ms` : (locale === 'zh' ? '计算中...' : 'calculating...')}
          </span>
        </div>
      )}
    </div>
  );
};

export default RealtimeMetricsDashboard;
