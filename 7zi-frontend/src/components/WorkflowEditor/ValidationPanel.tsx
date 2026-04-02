/**
 * ValidationPanel - 验证错误面板
 *
 * 显示工作流验证错误和警告
 */

import React from 'react';
import type { ValidationError } from './types';

interface ValidationPanelProps {
  errors: ValidationError[];
}

export function ValidationPanel({ errors }: ValidationPanelProps) {
  if (errors.length === 0) {
    return null;
  }

  const getErrorIcon = (severity: ValidationError['severity']) => {
    return severity === 'error' ? '❌' : '⚠️';
  };

  const getErrorColor = (severity: ValidationError['severity']) => {
    return severity === 'error'
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';
  };

  const getTypeLabel = (type: ValidationError['type']) => {
    switch (type) {
      case 'structure':
        return '结构';
      case 'config':
        return '配置';
      case 'logic':
        return '逻辑';
      default:
        return type;
    }
  };

  return (
    <div className="w-80 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/[0.2]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚠️</span>
        <h3 className="font-semibold text-red-900 dark:text-red-200">
          发现 {errors.length} 个问题
        </h3>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {errors.map((error, index) => (
          <div
            key={index}
            className="flex items-start gap-2 rounded border border-red-200 bg-white p-2 dark:border-red-800 dark:bg-red-900/[0.1]"
          >
            <span className={`text-sm ${getErrorColor(error.severity)}`}>
              {getErrorIcon(error.severity)}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {getTypeLabel(error.type)}
                </span>
                {error.nodeId && (
                  <span className="text-xs font-mono text-violet-600 dark:text-violet-400">
                    {error.nodeId}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-900 dark:text-white">
                {error.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-red-700 dark:text-red-300">
        请修复这些问题后再运行工作流
      </div>
    </div>
  );
}
