'use client';

import React, { useState, useCallback, useMemo } from 'react';

/**
 * @fileoverview 数据导出面板组件
 * @description 提供可视化的数据导出界面，支持字段选择和多种格式
 */

import {
  DataExporter,
  ExportFormat,
  ExportField,
  ExportResult,
  downloadExport,
} from '@/lib/export';

// ============================================================================
// 类型定义
// ============================================================================

export interface ExportPanelProps<T extends Record<string, unknown>> {
  /** 要导出的数据 */
  data: T[];
  /** 导出字段配置 */
  fields: ExportField<T>[];
  /** 默认文件名 */
  defaultFilename?: string;
  /** 支持的导出格式 */
  formats?: ExportFormat[];
  /** 导出完成回调 */
  onExport?: (result: ExportResult) => void;
  /** 面板标题 */
  title?: string;
  /** 描述文字 */
  description?: string;
  /** 是否显示字段选择 */
  showFieldSelector?: boolean;
  /** 是否显示预览 */
  showPreview?: boolean;
  /** 预览行数 */
  previewRows?: number;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 主组件
// ============================================================================

export function ExportPanel<T extends Record<string, unknown>>({
  data,
  fields,
  defaultFilename = 'export',
  formats = ['xlsx', 'csv', 'json'],
  onExport,
  title = '数据导出',
  description = '选择要导出的字段和格式',
  showFieldSelector = true,
  showPreview = true,
  previewRows = 5,
  className = '',
}: ExportPanelProps<T>): React.ReactElement {
  // 状态
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(fields.filter((f) => f.defaultSelected !== false).map((f) => f.key as string))
  );
  const [format, setFormat] = useState<ExportFormat>(formats[0]);
  const [filename, setFilename] = useState(defaultFilename);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算选中的字段列表
  const selectedFieldKeys = useMemo(
    () => Array.from(selectedFields) as (keyof T)[],
    [selectedFields]
  );

  // 切换字段选择
  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // 全选/取消全选
  const toggleAll = useCallback(() => {
    if (selectedFields.size === fields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(fields.map((f) => f.key as string)));
    }
  }, [selectedFields.size, fields]);

  // 执行导出
  const handleExport = useCallback(async () => {
    if (selectedFields.size === 0) {
      setError('请至少选择一个字段');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const exporter = new DataExporter<T>({
        filename,
        format,
        fields,
        selectedFields: selectedFieldKeys,
      });

      const result = await exporter.export(data);

      if (result.success) {
        downloadExport(result);
        onExport?.(result);
      } else {
        setError(result.error || '导出失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [data, fields, filename, format, selectedFieldKeys, selectedFields.size, onExport]);

  // 预览数据
  const previewData = useMemo(() => data.slice(0, previewRows), [data, previewRows]);
  const selectedFieldsList = fields.filter((f) => selectedFields.has(f.key as string));

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg shadow-lg ${className}`}>
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>📥</span> {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* 文件名输入 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            文件名
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg 
                         focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
                         bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
              placeholder="输入文件名"
            />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              .{format === 'xlsx' || format === 'excel' ? 'xlsx' : format}
            </span>
          </div>
        </div>

        {/* 格式选择 */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            导出格式
          </label>
          <div className="flex gap-2 flex-wrap">
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    format === f
                      ? 'bg-cyan-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                  }`}
              >
                {f === 'xlsx' || f === 'excel' ? '📊 Excel' : f === 'csv' ? '📄 CSV' : '📋 JSON'}
              </button>
            ))}
          </div>
        </div>

        {/* 字段选择 */}
        {showFieldSelector && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                选择字段 ({selectedFields.size}/{fields.length})
              </label>
              <button
                onClick={toggleAll}
                className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {selectedFields.size === fields.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {fields.map((field) => (
                <label
                  key={String(field.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
                    ${
                      selectedFields.has(field.key as string)
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700'
                        : 'bg-zinc-50 dark:bg-zinc-700/50 border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key as string)}
                    onChange={() => toggleField(field.key as string)}
                    className="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 数据预览 */}
        {showPreview && previewData.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              数据预览 (前 {previewRows} 条)
            </label>
            <div className="overflow-x-auto hide-scrollbar border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-700/50">
                  <tr>
                    {selectedFieldsList.map((field) => (
                      <th
                        key={String(field.key)}
                        className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
                      >
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {selectedFieldsList.map((field) => (
                        <td
                          key={String(field.key)}
                          className="px-3 py-2 text-sm text-zinc-900 dark:text-white whitespace-nowrap"
                        >
                          {formatCellValue(row[field.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length > previewRows && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                还有 {data.length - previewRows} 条数据未显示...
              </p>
            )}
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>📊 共 {data.length} 条数据</span>
          <span>📋 已选 {selectedFields.size} 个字段</span>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">❌ {error}</p>
          </div>
        )}

        {/* 导出按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting || selectedFields.size === 0}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                isExporting || selectedFields.size === 0
                  ? 'bg-zinc-300 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                导出中...
              </span>
            ) : (
              <span>📥 导出 {data.length} 条数据</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化单元格值
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ============================================================================
// 简化版本 - 导出按钮
// ============================================================================

export interface QuickExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  fields: ExportField<T>[];
  filename?: string;
  format?: ExportFormat;
  onExport?: (result: ExportResult) => void;
  className?: string;
}

/**
 * 快速导出按钮 - 一键导出
 */
export function QuickExportButton<T extends Record<string, unknown>>({
  data,
  fields,
  filename = 'export',
  format = 'xlsx',
  onExport,
  className = '',
}: QuickExportButtonProps<T>): React.ReactElement {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const exporter = new DataExporter<T>({
        filename,
        format,
        fields,
      });
      const result = await exporter.export(data);
      if (result.success) {
        downloadExport(result);
        onExport?.(result);
      }
    } finally {
      setIsExporting(false);
    }
  }, [data, fields, filename, format, onExport]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
        bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white transition-colors
        ${className}`}
    >
      {isExporting ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          导出中...
        </>
      ) : (
        <>
          <span>📥</span>
          导出
        </>
      )}
    </button>
  );
}

export default ExportPanel;