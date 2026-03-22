'use client';

/**
 * Performance Dashboard Component
 * 性能监控仪表板组件
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  monitor,
  AggregatedMetrics,
  AlarmEvent,
  getMonitoringConfig,
} from '@/lib/monitoring';
import { initBrowserTracking } from '@/lib/monitoring/utils';

interface PerformanceDashboardProps {
  refreshInterval?: number; // ms
  showAlarms?: boolean;
  showControls?: boolean;
  className?: string;
}

export function PerformanceDashboard({
  refreshInterval = 5000,
  showAlarms = true,
  showControls = true,
  className = '',
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showAlarmDetails, setShowAlarmDetails] = useState(false);

  // Initialize monitoring on mount
  useEffect(() => {
    initBrowserTracking();
    loadMetrics();
  }, []);

  // Auto refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      loadMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [metricsData, alarmsData] = await Promise.all([
        monitor.getAggregatedMetrics(5 * 60 * 1000), // 5 minutes window
        monitor.getAlarms(Date.now() - 60 * 60 * 1000), // Last hour
      ]);
      setMetrics(metricsData);
      setAlarms(alarmsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all monitoring data?')) {
      await monitor.clearAllData();
      loadMetrics();
    }
  };

  const config = getMonitoringConfig();

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${formatNumber(ms, 0)}ms`;
    if (ms < 60000) return `${formatNumber(ms / 1000, 2)}s`;
    return `${formatNumber(ms / 60000, 2)}m`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const getMetricTrend = (value: number, threshold: number) => {
    if (value > threshold) {
      return { icon: TrendingUp, color: 'text-red-500', label: 'Above threshold' };
    }
    return { icon: TrendingDown, color: 'text-green-500', label: 'Normal' };
  };

  if (isLoading && !metrics) {
    return (
      <div className={`bg-zinc-900 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin text-zinc-400 w-8 h-8" />
        </div>
      </div>
    );
  }

  const activeAlarms = alarms.filter((a) => a.severity === 'critical' || a.severity === 'high');

  return (
    <div className={`bg-zinc-900 rounded-lg p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="text-blue-500 w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Performance Dashboard</h2>
          {activeAlarms.length > 0 && (
            <div className="flex items-center space-x-1 bg-red-500/20 text-red-400 px-2 py-1 rounded">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{activeAlarms.length} Active Alarms</span>
            </div>
          )}
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            <button
              onClick={loadMetrics}
              disabled={isLoading}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearData}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Clear Data"
            >
              <Trash2 className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {showAlarms && activeAlarms.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Recent Alarms
            </h3>
            <button
              onClick={() => setShowAlarmDetails(!showAlarmDetails)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {showAlarmDetails ? 'Hide' : 'Show Details'}
            </button>
          </div>

          {activeAlarms.slice(0, showAlarmDetails ? undefined : 3).map((alarm) => (
            <div
              key={alarm.id}
              className="flex items-start space-x-3 bg-zinc-800 rounded-lg p-3 border-l-4 border-red-500"
            >
              <div className={`mt-0.5 ${getSeverityColor(alarm.severity)}`}>
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{alarm.message}</p>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-zinc-500">
                    {new Date(alarm.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Value: {formatNumber(alarm.currentValue)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Threshold: {formatNumber(alarm.threshold)}
                  </span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(alarm.severity)} text-white`}>
                {alarm.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* API Requests */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="text-blue-500 w-5 h-5" />
                <span className="text-sm font-medium text-zinc-300">API Requests</span>
              </div>
              <TrendingDown className="text-green-500 w-4 h-4" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.apiMetrics.totalRequests}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Success Rate</span>
                  <span className={formatPercent(metrics.apiMetrics.successRate) === '100.00%' ? 'text-green-400' : 'text-yellow-400'}>
                    {formatPercent(metrics.apiMetrics.successRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Avg Response</span>
                  <span className="text-white">{formatDuration(metrics.apiMetrics.averageResponseTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Error Rate</span>
                  <span className={metrics.apiMetrics.errorRate > 0.05 ? 'text-red-400' : 'text-zinc-300'}>
                    {formatPercent(metrics.apiMetrics.errorRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Zap className="text-yellow-500 w-5 h-5" />
                <span className="text-sm font-medium text-zinc-300">Operations</span>
              </div>
              <TrendingDown className="text-green-500 w-4 h-4" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.operationMetrics.totalOperations}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Success Rate</span>
                  <span className={formatPercent(metrics.operationMetrics.successRate) === '100.00%' ? 'text-green-400' : 'text-yellow-400'}>
                    {formatPercent(metrics.operationMetrics.successRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Avg Duration</span>
                  <span className="text-white">{formatDuration(metrics.operationMetrics.averageDuration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-red-500 w-5 h-5" />
                <span className="text-sm font-medium text-zinc-300">Errors</span>
              </div>
              <TrendingDown className="text-green-500 w-4 h-4" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">
                  {metrics.errorMetrics.totalErrors}
                </span>
                <span className="text-xs text-zinc-500">Last 5 min</span>
              </div>
              {Object.keys(metrics.errorMetrics.errorsByType).length > 0 && (
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {Object.entries(metrics.errorMetrics.errorsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-zinc-400 truncate">{type}</span>
                      <span className="text-zinc-300">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center space-x-4">
          <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          <span>Sampling rate: {formatPercent(config.sampleRate)}</span>
          <span>Status: {config.enabled ? 'Active' : 'Disabled'}</span>
        </div>
        <span>Time window: 5 minutes</span>
      </div>
    </div>
  );
}
