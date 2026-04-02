/**
 * ExecutionPanel - 执行监控面板
 *
 * 显示工作流执行状态、进度和日志
 */

import React from 'react';
import type { WorkflowInstance, ExecutionLog } from './types';

interface ExecutionPanelProps {
  instance: WorkflowInstance | null;
  logs: ExecutionLog[];
  isExecuting: boolean;
  onStop: () => void;
}

export function ExecutionPanel({ instance, logs, isExecuting, onStop }: ExecutionPanelProps) {
  const getProgressPercentage = () => {
    if (!instance) return 0;
    const { completed, failed, progress } = instance.progress;
    return progress || 0;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        {/* 进度信息 */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isExecuting ? '执行中...' : '执行完成'}
            </span>
            {instance && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {getProgressPercentage()}%
              </span>
            )}
          </div>

          {/* 进度条 */}
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-green-500 transition-all duration-300 dark:bg-green-600"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          {/* 统计信息 */}
          {instance && (
            <div className="mt-2 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium">{instance.progress.completed}</span> 已完成
              </div>
              <div>
                <span className="font-medium">{instance.progress.failed}</span> 失败
              </div>
              {instance.startTime && (
                <div>
                  <span className="font-medium">
                    {Math.floor((Date.now() - (typeof instance.startTime === 'number' ? instance.startTime : new Date(instance.startTime).getTime())) / 1000)}s
                  </span>{' '}
                  耗时
                </div>
              )}
            </div>
          )}
        </div>

        {/* 停止按钮 */}
        {isExecuting && (
          <button
            onClick={onStop}
            className="ml-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            停止
          </button>
        )}
      </div>

      {/* 执行日志 */}
      {logs.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            执行日志
          </h3>
          <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
            {logs.slice(-10).map((log, index) => (
              <div
                key={index}
                className="mb-1 flex gap-2 text-xs font-mono"
              >
                <span className="text-gray-400 dark:text-gray-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : log.level === 'warn'
                      ? 'text-amber-600 dark:text-amber-400'
                      : log.level === 'info'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                >
                  [{log.level.toUpperCase()}]
                </span>
                {log.nodeId && (
                  <span className="text-violet-600 dark:text-violet-400">
                    {log.nodeId}
                  </span>
                )}
                <span className="flex-1 text-gray-700 dark:text-gray-300">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
