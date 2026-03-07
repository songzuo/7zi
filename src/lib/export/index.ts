/**
 * @fileoverview 数据导出工具
 * @description 支持多种格式的数据导出（CSV、JSON、Excel）
 */

import * as XLSX from 'xlsx';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 支持的导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'excel';

/**
 * 字段配置
 */
export interface ExportField<T = Record<string, unknown>> {
  /** 字段键名 */
  key: keyof T;
  /** 显示名称 */
  label: string;
  /** 自定义格式化函数 */
  formatter?: (value: T[keyof T], row: T) => string | number | boolean | null;
  /** 是否默认选中 */
  defaultSelected?: boolean;
}

/**
 * 导出配置
 */
export interface ExportConfig<T = Record<string, unknown>> {
  /** 文件名（不含扩展名） */
  filename: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 要导出的字段配置 */
  fields: ExportField<T>[];
  /** 选中的字段键名（可选，不指定则导出所有） */
  selectedFields?: (keyof T)[];
  /** 工作表名称（仅 Excel） */
  sheetName?: string;
  /** 是否包含表头 */
  includeHeader?: boolean;
  /** 时间戳格式 */
  timestampFormat?: 'iso' | 'locale' | 'unix';
  /** 自定义数据处理 */
  transform?: (data: T[]) => T[];
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}

// ============================================================================
// 核心导出类
// ============================================================================

/**
 * 数据导出器
 */
export class DataExporter<T extends Record<string, unknown>> {
  private config: ExportConfig<T>;

  constructor(config: ExportConfig<T>) {
    this.config = {
      includeHeader: true,
      timestampFormat: 'locale',
      sheetName: 'Sheet1',
      ...config,
    };
  }

  /**
   * 执行导出
   */
  export(data: T[]): ExportResult {
    try {
      // 数据预处理
      const processedData = this.config.transform ? this.config.transform(data) : data;

      // 根据格式选择导出方法
      switch (this.config.format) {
        case 'csv':
          return this.exportCSV(processedData);
        case 'json':
          return this.exportJSON(processedData);
        case 'xlsx':
        case 'excel':
          return this.exportExcel(processedData);
        default:
          return { success: false, error: `不支持的导出格式: ${this.config.format}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      };
    }
  }

  /**
   * 获取选中的字段
   */
  private getSelectedFields(): ExportField<T>[] {
    if (this.config.selectedFields && this.config.selectedFields.length > 0) {
      return this.config.fields.filter((f) =>
        this.config.selectedFields!.includes(f.key)
      );
    }
    // 返回默认选中的字段，如果没有则返回全部
    const defaultFields = this.config.fields.filter((f) => f.defaultSelected !== false);
    return defaultFields.length > 0 ? defaultFields : this.config.fields;
  }

  /**
   * 格式化字段值
   */
  private formatFieldValue(
    field: ExportField<T>,
    row: T
  ): string | number | boolean | null {
    const value = row[field.key];
    if (field.formatter) {
      return field.formatter(value, row);
    }
    // 默认处理
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value as string | number | boolean;
  }

  /**
   * 转换数据为导出格式
   */
  private transformData(data: T[]): Record<string, unknown>[] {
    const fields = this.getSelectedFields();

    return data.map((row) => {
      const result: Record<string, unknown> = {};
      fields.forEach((field) => {
        result[field.label] = this.formatFieldValue(field, row);
      });
      return result;
    });
  }

  /**
   * 导出为 CSV
   */
  private exportCSV(data: T[]): ExportResult {
    const fields = this.getSelectedFields();
    const transformedData = this.transformData(data);

    // 生成 CSV 内容
    const lines: string[] = [];

    // 添加表头
    if (this.config.includeHeader) {
      lines.push(fields.map((f) => this.escapeCSV(f.label)).join(','));
    }

    // 添加数据行
    transformedData.forEach((row) => {
      const values = fields.map((f) => {
        const value = row[f.label];
        return this.escapeCSV(String(value ?? ''));
      });
      lines.push(values.join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const filename = `${this.config.filename}.csv`;

    return { success: true, blob, filename };
  }

  /**
   * 导出为 JSON
   */
  private exportJSON(data: T[]): ExportResult {
    const transformedData = this.transformData(data);
    const jsonContent = JSON.stringify(transformedData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const filename = `${this.config.filename}.json`;

    return { success: true, blob, filename };
  }

  /**
   * 导出为 Excel
   */
  private exportExcel(data: T[]): ExportResult {
    const transformedData = this.transformData(data);
    const fields = this.getSelectedFields();

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 准备数据（包含表头）
    const sheetData: (string | number | boolean | null)[][] = [];

    if (this.config.includeHeader) {
      sheetData.push(fields.map((f) => f.label));
    }

    transformedData.forEach((row) => {
      const values = fields.map((f) => {
        const value = row[f.label];
        return value ?? '';
      });
      sheetData.push(values);
    });

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    const colWidths = fields.map((f) => ({ wch: Math.max(f.label.length * 2, 15) }));
    worksheet['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, this.config.sheetName);

    // 生成文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const filename = `${this.config.filename}.xlsx`;

    return { success: true, blob, filename };
  }

  /**
   * CSV 转义
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速导出数据
 */
export function exportData<T extends Record<string, unknown>>(
  data: T[],
  config: ExportConfig<T>
): ExportResult {
  const exporter = new DataExporter(config);
  return exporter.export(data);
}

/**
 * 下载导出文件
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.blob || !result.filename) {
    console.error('导出失败:', result.error);
    return;
  }

  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 创建默认字段配置
 */
export function createFields<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  labels?: Partial<Record<keyof T, string>>
): ExportField<T>[] {
  return keys.map((key) => ({
    key,
    label: (labels?.[key] as string) || String(key),
    defaultSelected: true,
  }));
}

// ============================================================================
// 预定义格式化器
// ============================================================================

/**
 * 日期格式化器
 */
export function dateFormatter(
  format: 'iso' | 'locale' | 'unix' = 'locale'
): (value: unknown) => string {
  return (value: unknown) => {
    if (!value) return '';
    const date = new Date(value as string | number | Date);
    if (isNaN(date.getTime())) return String(value);

    switch (format) {
      case 'iso':
        return date.toISOString();
      case 'unix':
        return String(Math.floor(date.getTime() / 1000));
      case 'locale':
      default:
        return date.toLocaleString('zh-CN');
    }
  };
}

/**
 * 布尔值格式化器
 */
export function booleanFormatter(
  trueLabel = '是',
  falseLabel = '否'
): (value: unknown) => string {
  return (value: unknown) => {
    if (typeof value === 'boolean') {
      return value ? trueLabel : falseLabel;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return trueLabel;
      if (lower === 'false' || lower === '0' || lower === 'no') return falseLabel;
    }
    if (typeof value === 'number') {
      return value ? trueLabel : falseLabel;
    }
    return String(value);
  };
}

/**
 * 数组格式化器
 */
export function arrayFormatter(separator = ', '): (value: unknown) => string {
  return (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(separator);
    }
    return String(value);
  };
}

/**
 * 截断格式化器
 */
export function truncateFormatter(maxLength: number): (value: unknown) => string {
  return (value: unknown) => {
    const str = String(value ?? '');
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  };
}
