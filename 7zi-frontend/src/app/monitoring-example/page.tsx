'use client';

/**
 * Example Page with Performance Monitoring
 * 带有性能监控的示例页面
 */

import React, { useState, useEffect } from 'react';
import { EnhancedPerformanceDashboard } from '@/features/monitoring';
import {
  monitoredFetch,
  monitor,
  withPerformanceTracking,
  createPerformanceTracker,
} from '@/lib/monitoring';
import { initWebVitalsMonitoring, initCustomMetricsTracking, budgetManager } from '@/lib/performance';

export default function MonitoringExamplePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Initialize performance monitoring on mount
  useEffect(() => {
    initWebVitalsMonitoring({
      enabled: true,
      trackAllMetrics: true,
    });
    initCustomMetricsTracking({
      trackMemory: true,
      trackNetwork: true,
      trackResources: true,
    });
    addLog('Performance monitoring initialized');
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  };

  // Example 1: Load users with monitored fetch
  const loadUsers = async () => {
    setLoading(true);
    addLog('Loading users...');

    try {
      // 使用监控的 fetch（即使是失败的请求也会被追踪）
      const response = await monitoredFetch('/api/users', {
        method: 'GET',
        metadata: {
          operation: 'load_users_example',
          source: 'monitoring_example_page',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        addLog(`Loaded ${data.length} users`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      addLog(`Error loading users: ${error}`);
      // 手动追踪错误
      await monitor.trackError(
        'LoadUsersError',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Simulate slow operation with tracking
  const simulateSlowOperation = async () => {
    addLog('Starting slow operation...');

    await withPerformanceTracking('slow_operation_example', async () => {
      // 模拟慢操作
      await new Promise(resolve => setTimeout(resolve, 2000));
      addLog('Slow operation completed');
    }, {
      simulated: true,
      durationMs: 2000,
    });
  };

  // Example 3: Simulate error
  const simulateError = async () => {
    addLog('Simulating error...');

    try {
      await withPerformanceTracking('error_operation_example', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error('Simulated error for testing');
      });
    } catch (error) {
      addLog('Error caught and tracked');
    }
  };

  // Example 4: Manual operation tracking
  const manualOperation = async () => {
    addLog('Starting manual operation...');

    const opId = monitor.startOperation('manual_operation_example');

    try {
      // 模拟工作
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('Manual operation completed successfully');

      await monitor.endOperation(opId, true, {
        manualTracking: true,
        customField: 'example_value',
      });
    } catch (error) {
      addLog('Manual operation failed');
      await monitor.endOperation(opId, false, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Example 5: Custom metric tracking
  const trackCustomMetric = async () => {
    addLog('Tracking custom metrics...');

    // 追踪多个自定义指标
    await monitor.trackCustomMetric('memory_usage', 512, 'MB', {
      type: 'system',
      source: 'manual',
    });

    await monitor.trackCustomMetric('cache_hit_rate', 85, '%', {
      cacheType: 'redis',
    });

    await monitor.trackCustomMetric('database_connections', 15, 'count', {
      database: 'postgres',
    });

    addLog('Custom metrics tracked');
  };

  // Example 6: Using performance tracker helper
  const useTracker = () => {
    addLog('Using performance tracker helper...');

    const tracker = createPerformanceTracker('tracker_example');

    tracker.track(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      addLog('Tracked operation completed');
    }, {
      helperMethod: true,
    });
  };

  // Example 8: Check performance budget
  const checkPerformanceBudget = async () => {
    addLog('Checking performance budget...');

    // Get budget report
    const webVitals = (await import('@/lib/performance')).webVitalsMonitor.getMetrics();
    const customMetrics = (await import('@/lib/performance')).customMetricsTracker.getMetrics();
    const report = budgetManager.calculateBudgetReport(webVitals, customMetrics);

    addLog(`Overall Score: ${report.overallScore.toFixed(0)}`);
    addLog(`Status: ${report.status.toUpperCase()}`);
    addLog(`Violations: ${report.violations.length}`);
    addLog(`Recommendations: ${report.recommendations.length}`);

    // Log violations
    if (report.violations.length > 0) {
      report.violations.slice(0, 3).forEach((v) => {
        addLog(`- ${v.metric}: ${v.currentValue.toFixed(2)} > ${v.threshold} (${v.severity})`);
      });
    }
  };
  const generateRequests = async () => {
    addLog('Generating API requests...');

    const endpoints = ['/api/health', '/api/config', '/api/status'];

    for (const endpoint of endpoints) {
      try {
        await monitoredFetch(endpoint, {
          method: 'GET',
          metadata: { batch: true },
        });
      } catch (error) {
        // Errors are automatically tracked
      }
    }

    addLog('Generated 3 API requests');
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Performance Monitoring Example
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            体验性能监控和告警系统的各种功能
          </p>
        </div>

        {/* Performance Dashboard */}
        <EnhancedPerformanceDashboard
          showWebVitals={true}
          showBudget={true}
          showAlarms={true}
          refreshInterval={5000}
        />

        {/* Example Buttons */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg dark:shadow-none p-6">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">示例操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded"
            >
              {loading ? 'Loading...' : 'Load Users'}
            </button>

            <button
              onClick={simulateSlowOperation}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              Simulate Slow Operation
            </button>

            <button
              onClick={simulateError}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Simulate Error
            </button>

            <button
              onClick={manualOperation}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
            >
              Manual Operation
            </button>

            <button
              onClick={trackCustomMetric}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Track Custom Metric
            </button>

            <button
              onClick={useTracker}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Use Tracker Helper
            </button>

            <button
              onClick={generateRequests}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded"
            >
              Generate API Requests
            </button>

            <button
              onClick={checkPerformanceBudget}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Check Budget
            </button>

            <button
              onClick={() => {
                monitor.clearAllData();
                setLogs([]);
                addLog('All monitoring data cleared');
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Clear Data
            </button>
          </div>
        </div>

        {/* Operation Log */}
        {logs.length > 0 && (
          <div className="bg-zinc-800 dark:bg-zinc-900 text-zinc-100 rounded-2xl shadow-lg dark:shadow-none p-6">
            <h2 className="text-xl font-semibold mb-4 text-zinc-100 dark:text-zinc-100">操作日志</h2>
            <div className="space-y-1 font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="border-l-2 border-green-500 pl-2">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Data */}
        {users.length > 0 && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg dark:shadow-none p-6">
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">用户数据</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                  {users.slice(0, 10).map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                        {user.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length > 10 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">
                  Showing 10 of {users.length} users
                </p>
              )}
            </div>
          </div>
        )}

        {/* Usage Notes */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 使用说明</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>点击各种按钮来体验不同的监控功能</li>
            <li>观察上方的性能仪表板，指标会实时更新</li>
            <li>触发错误或慢操作会显示告警</li>
            <li>所有操作都会被追踪和记录</li>
            <li>刷新页面后数据会保留（使用 localStorage 存储）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
