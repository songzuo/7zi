/**
 * 数据导入功能 Hook
 * 提供任务的 CSV/JSON 导入功能
 * @module hooks/useImport
 */

import { useState, useCallback } from 'react';
import { TaskPriority, TaskStatus } from '../lib/tasks/types';

// 导入格式
export type ImportFormat = 'csv' | 'json' | 'auto';

// 字段映射
export interface FieldMapping {
  sourceField: string; // 源文件字段名
  targetField: string; // 目标字段名
  transform?: (value: string) => unknown; // 转换函数
}

// 导入选项
export interface ImportOptions {
  format?: ImportFormat;
  skipErrors?: boolean; // 跳过错误行继续导入
  updateExisting?: boolean; // 更新已存在的任务
  defaultPriority?: TaskPriority;
  defaultStatus?: TaskStatus;
  tagMapping?: Record<string, string>; // 标签映射
  fieldMappings?: FieldMapping[]; // 字段映射
}

// 导入预览数据
export interface ImportPreview {
  format: 'csv' | 'json';
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  validRows: number;
  errors: { row: number; message: string }[];
}

// 导入结果
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: { row: number; field?: string; message: string }[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

// Hook 返回类型
interface UseImportReturn {
  // 状态
  loading: boolean;
  error: string | null;
  preview: ImportPreview | null;
  result: ImportResult | null;
  file: File | null;

  // 方法
  parseFile: (file: File) => Promise<ImportPreview | null>;
  importData: (options?: ImportOptions) => Promise<ImportResult | null>;
  downloadTemplate: (format: 'csv' | 'json') => Promise<void>;
  setFieldMapping: (mapping: FieldMapping[]) => void;
  reset: () => void;
}

/**
 * 解析 CSV 文本为预览数据
 */
function parseCSVPreview(csvText: string, maxRows = 100): ImportPreview {
  const lines = csvText.trim().split(/\r?\n/);
  const errors: { row: number; message: string }[] = [];

  if (lines.length < 2) {
    return {
      format: 'csv',
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errors: [{ row: 0, message: 'CSV 文件至少需要包含表头和一行数据' }],
    };
  }

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  let validRows = 0;

  // 解析数据行（最多 maxRows 行）
  const dataLines = lines.slice(1, maxRows + 1);
  for (let i = 0; i < dataLines.length; i++) {
    const values = parseCSVLine(dataLines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header.trim().toLowerCase()] = values[index] || '';
    });
    
    rows.push(row);
    
    // 验证必须有标题字段
    const title = row.title || row.name || row['任务名称'] || row['标题'];
    if (title) {
      validRows++;
    } else {
      errors.push({ row: i + 2, message: '缺少任务标题' });
    }
  }

  return {
    format: 'csv',
    headers: headers.map(h => h.trim().toLowerCase()),
    rows,
    totalRows: lines.length - 1,
    validRows,
    errors,
  };
}

/**
 * 解析单行 CSV
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
}

/**
 * 解析 JSON 文本为预览数据
 */
function parseJSONPreview(jsonText: string, maxRows = 100): ImportPreview {
  const errors: { row: number; message: string }[] = [];

  try {
    const data = JSON.parse(jsonText);
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      return {
        format: 'json',
        headers: [],
        rows: [],
        totalRows: 0,
        validRows: 0,
        errors: [{ row: 0, message: 'JSON 数据需要包含 tasks 数组' }],
      };
    }

    const tasks = data.tasks.slice(0, maxRows);
    const rows: Record<string, string>[] = [];
    let validRows = 0;

    // 获取所有可能的字段
    const allFields = new Set<string>();
    tasks.forEach((task: Record<string, unknown>) => {
      Object.keys(task).forEach(key => allFields.add(key));
    });
    const headers = Array.from(allFields);

    // 转换为行数据
    tasks.forEach((task: Record<string, unknown>, index: number) => {
      const row: Record<string, string> = {};
      
      headers.forEach(header => {
        const value = task[header];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            row[header] = value.join(',');
          } else if (typeof value === 'object') {
            row[header] = JSON.stringify(value);
          } else {
            row[header] = String(value);
          }
        } else {
          row[header] = '';
        }
      });
      
      rows.push(row);
      
      // 验证必须有标题
      if (task.title) {
        validRows++;
      } else {
        errors.push({ row: index + 1, message: '缺少任务标题' });
      }
    });

    return {
      format: 'json',
      headers,
      rows,
      totalRows: data.tasks.length,
      validRows,
      errors,
    };
  } catch (e) {
    return {
      format: 'json',
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errors: [{ row: 0, message: `JSON 解析失败: ${e instanceof Error ? e.message : '未知错误'}` }],
    };
  }
}

/**
 * 数据导入 Hook
 */
export function useImport(): UseImportReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // 解析文件生成预览
  const parseFile = useCallback(async (file: File): Promise<ImportPreview | null> => {
    setLoading(true);
    setError(null);
    setFile(file);

    try {
      const content = await file.text();
      const extension = file.name.toLowerCase().split('.').pop();
      
      let previewData: ImportPreview;
      
      if (extension === 'json' || content.trim().startsWith('{') || content.trim().startsWith('[')) {
        previewData = parseJSONPreview(content);
      } else {
        previewData = parseCSVPreview(content);
      }
      
      setPreview(previewData);
      return previewData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '文件解析失败';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 执行导入
  const importData = useCallback(async (options?: ImportOptions): Promise<ImportResult | null> => {
    if (!file) {
      setError('没有选择文件');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options) {
        formData.append('options', JSON.stringify(options));
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data: ImportResult = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.message || '导入失败');
      }

      setResult(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导入失败';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [file]);

  // 下载模板
  const downloadTemplate = useCallback(async (format: 'csv' | 'json'): Promise<void> => {
    try {
      const response = await fetch(`/api/import?action=template&format=${format}`);
      
      if (!response.ok) {
        throw new Error('获取模板失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `import-template.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '下载模板失败';
      setError(errorMessage);
    }
  }, []);

  // 设置字段映射
  const handleSetFieldMapping = useCallback((mapping: FieldMapping[]) => {
    setFieldMappings(mapping);
  }, []);

  // 重置状态
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setPreview(null);
    setResult(null);
    setFile(null);
    setFieldMappings([]);
  }, []);

  return {
    loading,
    error,
    preview,
    result,
    file,
    parseFile,
    importData,
    downloadTemplate,
    setFieldMapping: handleSetFieldMapping,
    reset,
  };
}