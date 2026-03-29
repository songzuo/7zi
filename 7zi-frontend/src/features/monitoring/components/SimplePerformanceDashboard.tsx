'use client';

/**
 * Simple Performance Dashboard Component
 * 简化的性能监控仪表板组件（无需外部图表库）
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  monitor,
  AggregatedMetrics,
  AlarmEvent,
} from '@/lib/monitoring';

interface SimplePerformanceDashboardProps {
  refreshInterval?: number;
  showAlarms?: boolean;
  className?: string;
}

export function SimplePerformanceDashboard({
  refreshInterval = 5000,
  showAlarms = true,
  className = '',
}: SimplePerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMetrics = async () => {
    try {
      const [metricsData, alarmsData] = await Promise.all([
        monitor.getAggregatedMetrics(5 * 60 * 1000),
        monitor.getAlarms(Date.now() - 60 * 60 * 1000),
      ]);
      setMetrics(metricsData);
      setAlarms(alarmsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Clear all monitoring data?')) {
      await monitor.clearAllData();
      loadMetrics();
    }
  };

  const formatPercent = (num: number): string => `${(num * 100).toFixed(2)}%`;
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const activeAlarms = alarms.filter(a => a.severity === 'critical' || a.severity === 'high');

  if (isLoading && !metrics) {
    return <div className={`bg-zinc-900 dark:bg-zinc-950 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="animate-spin text-zinc-400 w-8 h-8" />
      </div>
    </div>;
  }

  return (
    <div className={`bg-zinc-900 dark:bg-zinc-950 rounded-2xl p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="text-blue-500 w-6 h-6" />
          <h2 className="text-xl font-bold text-zinc-100 dark:text-zinc-100">Performance Monitor</h2>
          {activeAlarms.length > 0 && (
            <div className="flex items-center space-x-1 bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{activeAlarms.length} Alarms</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClearData}
          className="p-2 hover:bg-zinc-800 dark:hover:bg-zinc-900 rounded-2xl transition-colors"
        >
          <Trash2 className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        </button>
      </div>

      {/* Alarms */}
      {showAlarms && activeAlarms.length > 0 && (
        <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 dark:border-red-500/40 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-red-400 dark:text-red-300 mb-2">Active Alarms</h3>
          {activeAlarms.slice(0, 3).map(alarm => (
            <div key={alarm.id} className="text-sm text-zinc-300 dark:text-zinc-400 py-1">
              • {alarm.message}
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API */}
          <div className="bg-zinc-800 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-700 dark:border-zinc-800">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="text-blue-500 w-4 h-4" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">API Requests</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="text-zinc-100 dark:text-zinc-100 font-bold">{metrics.apiMetrics.totalRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Avg Time</span>
                <span className="text-zinc-100 dark:text-zinc-100">{formatDuration(metrics.apiMetrics.averageResponseTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Success</span>
                <span className="text-green-400">{formatPercent(metrics.apiMetrics.successRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Errors</span>
                <span className={metrics.apiMetrics.errorRate > 0.05 ? 'text-red-400' : 'text-zinc-300 dark:text-zinc-400'}>
                  {formatPercent(metrics.apiMetrics.errorRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="bg-zinc-800 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-700 dark:border-zinc-800">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="text-yellow-500 w-4 h-4" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">Operations</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="text-zinc-100 dark:text-zinc-100 font-bold">{metrics.operationMetrics.totalOperations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Avg Time</span>
                <span className="text-zinc-100 dark:text-zinc-100">{formatDuration(metrics.operationMetrics.averageDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Success</span>
                <span className="text-green-400">{formatPercent(metrics.operationMetrics.successRate)}</span>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="bg-zinc-800 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-700 dark:border-zinc-800">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-red-500 w-4 h-4" />
              <span className="text-sm font-medium text-zinc-300 dark:text-zinc-300">Errors</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400 dark:text-zinc-500">Total</span>
                <span className="text-zinc-100 dark:text-zinc-100 font-bold">{metrics.errorMetrics.totalErrors}</span>
              </div>
              {Object.entries(metrics.errorMetrics.errorsByType).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="text-zinc-400 dark:text-zinc-500 truncate">{type}</span>
                  <span className="text-zinc-300 dark:text-zinc-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-zinc-500 dark:text-zinc-600 flex justify-between">
        <span>Time window: 5 minutes</span>
        {isLoading && <RefreshCw className="animate-spin w-3 h-3" />}
      </div>
    </div>
  );
}
