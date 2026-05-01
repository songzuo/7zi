/**
 * Webhook 日志查看组件
 * 7zi-frontend v1.12.2
 */

'use client';

import React, { useState, useEffect } from 'react';
import { WebhookLog, WebhookLogLevel } from '@/lib/webhook';
import { useWebhookLogs } from '@/hooks/useWebhooks';

// ==================== 类型定义 ====================

interface WebhookLogViewerProps {
  subscriptionId?: string;
  deliveryId?: string;
  level?: WebhookLogLevel;
  limit?: number;
}

// ==================== 组件 ====================

export function WebhookLogViewer({
  subscriptionId,
  deliveryId,
  level,
  limit = 100,
}: WebhookLogViewerProps) {
  const { logs, isLoading, loadLogs } = useWebhookLogs(subscriptionId, deliveryId, level, limit);

  const [filterLevel, setFilterLevel] = useState<WebhookLogLevel | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  // 过滤日志
  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  // 日志级别颜色
  const getLevelColor = (level: WebhookLogLevel): string => {
    const colors: Record<WebhookLogLevel, string> = {
      debug: 'bg-gray-100 text-gray-800',
      info: 'bg-blue-100 text-blue-800',
      warn: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[level];
  };

  // 日志级别标签
  const getLevelLabel = (level: WebhookLogLevel): string => {
    const labels: Record<WebhookLogLevel, string> = {
      debug: '调试',
      info: '信息',
      warn: '警告',
      error: '错误',
    };
    return labels[level];
  };

  // 格式化时间
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 格式化上下文
  const formatContext = (context?: Record<string, unknown>): string => {
    if (!context) return '';
    return JSON.stringify(context, null, 2);
  };

  return (
    <div className="webhook-log-viewer">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Webhook 日志</h3>
        <div className="flex items-center space-x-3">
          {/* 级别过滤 */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as WebhookLogLevel | 'all')}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="all">全部级别</option>
            <option value="debug">调试</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
          </select>

          {/* 自动刷新开关 */}
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>自动刷新</span>
          </label>

          {/* 刷新按钮 */}
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md disabled:opacity-50"
          >
            {isLoading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {isLoading ? '加载中...' : '暂无日志'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-md p-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {/* 级别徽章 */}
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelColor(
                      log.level
                    )}`}
                  >
                    {getLevelLabel(log.level)}
                  </span>

                  {/* 时间 */}
                  <span className="text-xs text-gray-500">
                    {formatTime(log.timestamp)}
                  </span>

                  {/* 订阅 ID */}
                  {log.context?.subscriptionId && (
                    <span className="text-xs text-gray-500">
                      订阅: {String(log.context.subscriptionId).slice(0, 8)}...
                    </span>
                  )}

                  {/* 交付 ID */}
                  {log.context?.deliveryId && (
                    <span className="text-xs text-gray-500">
                      交付: {String(log.context.deliveryId).slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>

              {/* 消息 */}
              <p className="text-sm text-gray-900 mb-2">{log.message}</p>

              {/* 上下文 */}
              {log.context && Object.keys(log.context).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                    查看详情
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {formatContext(log.context)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {filteredLogs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>共 {filteredLogs.length} 条日志</span>
            <span>
              错误: {filteredLogs.filter((l) => l.level === 'error').length} | 警告:{' '}
              {filteredLogs.filter((l) => l.level === 'warn').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}