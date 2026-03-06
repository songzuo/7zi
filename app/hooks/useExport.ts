/**
 * 导出功能 Hook
 * 提供任务的导出功能
 */

import { useState, useCallback } from 'react';
import { TaskPriority, TaskStatus } from '../tasks/types';

// 导出格式
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'excel';

// 导出类型
export type ExportType = 'tasks' | 'stats' | 'all' | 'custom';

// 导出选项
export interface ExportOptions {
  format: ExportFormat;
  type?: ExportType;
  // 筛选选项
  startDate?: string;
  endDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  includeCompleted?: boolean;
  // 自定义数据
  taskIds?: string[];
}

// 导出结果
export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// Hook 返回类型
interface UseExportReturn {
  // 状态
  loading: boolean;
  error: string | null;
  lastExport: ExportResult | null;

  // 导出方法
  exportTasks: (options: ExportOptions) => Promise<ExportResult>;
  exportTasksAsJSON: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsCSV: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsPDF: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsExcel: (taskIds?: string[]) => Promise<ExportResult>;
  exportStats: () => Promise<ExportResult>;
  exportCustomData: (data: unknown[], format: 'json' | 'csv') => Promise<ExportResult>;

  // 下载方法
  downloadBlob: (blob: Blob, filename: string) => void;

  // 重置状态
  reset: () => void;
}

/**
 * 导出功能 Hook
 */
export function useExport(): UseExportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  // 下载 Blob
  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // 构建查询参数
  const buildQueryString = useCallback((options: ExportOptions): string => {
    const params = new URLSearchParams();
    
    params.set('format', options.format);
    if (options.type) params.set('type', options.type);
    if (options.startDate) params.set('startDate', options.startDate);
    if (options.endDate) params.set('endDate', options.endDate);
    if (options.priority) params.set('priority', options.priority);
    if (options.status) params.set('status', options.status);
    if (options.assignee) params.set('assignee', options.assignee);
    if (options.tags && options.tags.length > 0) params.set('tags', options.tags.join(','));
    if (options.includeCompleted !== undefined) {
      params.set('includeCompleted', String(options.includeCompleted));
    }

    return params.toString();
  }, []);

  // 获取文件名
  const getFilename = useCallback((format: ExportFormat, type: string): string => {
    const dateStr = new Date().toISOString().split('T')[0];
    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      csv: 'csv',
      pdf: 'pdf',
      excel: 'xlsx',
    };
    return `${type}-export-${dateStr}.${extensions[format]}`;
  }, []);

  // 通用导出方法
  const exportTasks = useCallback(
    async (options: ExportOptions): Promise<ExportResult> => {
      setLoading(true);
      setError(null);

      try {
        let response: Response;
        let blob: Blob;
        let filename: string;

        // 如果有指定的任务 ID，使用 POST 方法
        if (options.taskIds && options.taskIds.length > 0) {
          response = await fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              format: options.format,
              type: 'tasks',
              taskIds: options.taskIds,
            }),
          });
        } else {
          // 使用 GET 方法和查询参数
          const queryString = buildQueryString(options);
          response = await fetch(`/api/export?${queryString}`);
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }

        // 获取 Blob
        blob = await response.blob();
        filename = getFilename(options.format, options.type || 'tasks');

        const result: ExportResult = {
          success: true,
          blob,
          filename,
        };

        setLastExport(result);

        // 自动下载
        downloadBlob(blob, filename);

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        const errorResult: ExportResult = {
          success: false,
          error: errorMessage,
        };
        setLastExport(errorResult);
        return errorResult;
      } finally {
        setLoading(false);
      }
    },
    [buildQueryString, downloadBlob, getFilename]
  );

  // 导出为 JSON
  const exportTasksAsJSON = useCallback(
    (taskIds?: string[]) =>
      exportTasks({ format: 'json', type: 'tasks', taskIds }),
    [exportTasks]
  );

  // 导出为 CSV
  const exportTasksAsCSV = useCallback(
    (taskIds?: string[]) =>
      exportTasks({ format: 'csv', type: 'tasks', taskIds }),
    [exportTasks]
  );

  // 导出为 PDF
  const exportTasksAsPDF = useCallback(
    (taskIds?: string[]) =>
      exportTasks({ format: 'pdf', type: 'tasks', taskIds }),
    [exportTasks]
  );

  // 导出为 Excel
  const exportTasksAsExcel = useCallback(
    (taskIds?: string[]) =>
      exportTasks({ format: 'excel', type: 'tasks', taskIds }),
    [exportTasks]
  );

  // 导出统计信息
  const exportStats = useCallback(async (): Promise<ExportResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/export?format=json&type=stats');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const filename = getFilename('json', 'stats');

      const result: ExportResult = {
        success: true,
        blob,
        filename,
      };

      setLastExport(result);
      downloadBlob(blob, filename);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      const errorResult: ExportResult = {
        success: false,
        error: errorMessage,
      };
      setLastExport(errorResult);
      return errorResult;
    } finally {
      setLoading(false);
    }
  }, [downloadBlob, getFilename]);

  // 导出自定义数据
  const exportCustomData = useCallback(
    async (data: unknown[], format: 'json' | 'csv'): Promise<ExportResult> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format,
            type: 'custom',
            data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Export failed');
        }

        const blob = await response.blob();
        const filename = getFilename(format, 'custom');

        const result: ExportResult = {
          success: true,
          blob,
          filename,
        };

        setLastExport(result);
        downloadBlob(blob, filename);

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        const errorResult: ExportResult = {
          success: false,
          error: errorMessage,
        };
        setLastExport(errorResult);
        return errorResult;
      } finally {
        setLoading(false);
      }
    },
    [downloadBlob, getFilename]
  );

  // 重置状态
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setLastExport(null);
  }, []);

  return {
    loading,
    error,
    lastExport,
    exportTasks,
    exportTasksAsJSON,
    exportTasksAsCSV,
    exportTasksAsPDF,
    exportTasksAsExcel,
    exportStats,
    exportCustomData,
    downloadBlob,
    reset,
  };
}

export default useExport;
