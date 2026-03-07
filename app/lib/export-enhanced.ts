/**
 * 导出增强模块 - 支持 Excel 高级导出和自定义字段
 * @module lib/export-enhanced
 */

import * as XLSX from 'xlsx';
import type { Task, TaskStats, TaskPriority, TaskStatus } from './tasks/types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 自定义字段定义
 */
export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[]; // 用于 select 类型
  defaultValue?: unknown;
  required?: boolean;
}

/**
 * 自定义字段值
 */
export interface CustomFieldValue {
  fieldId: string;
  value: unknown;
}

/**
 * 带自定义字段的任务
 */
export interface TaskWithCustomFields extends Task {
  customFields?: CustomFieldValue[];
}

/**
 * 导出列配置
 */
export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: string;
  type?: 'text' | 'number' | 'date' | 'boolean';
  transform?: (value: unknown, row: TaskWithCustomFields) => unknown;
}

/**
 * Excel 导出选项
 */
export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  columns?: ExportColumn[];
  includeHeaders?: boolean;
  style?: ExcelStyleOptions;
  customFields?: CustomFieldDefinition[];
  includeStats?: boolean;
  freezeHeader?: boolean;
  autoFilter?: boolean;
}

/**
 * Excel 样式选项
 */
export interface ExcelStyleOptions {
  headerStyle?: {
    bold?: boolean;
    backgroundColor?: string;
    fontColor?: string;
    fontSize?: number;
  };
  cellStyle?: {
    fontSize?: number;
    alignment?: 'left' | 'center' | 'right';
  };
  conditionalFormatting?: ConditionalFormatRule[];
}

/**
 * 条件格式规则
 */
export interface ConditionalFormatRule {
  column: string;
  condition: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: unknown;
  style: {
    backgroundColor?: string;
    fontColor?: string;
    bold?: boolean;
  };
}

/**
 * 导出模板
 */
export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  columns: ExportColumn[];
  customFields?: CustomFieldDefinition[];
  defaultOptions?: Partial<ExcelExportOptions>;
}

/**
 * 批量导出结果
 */
export interface EnhancedBatchExportResult {
  excel?: {
    blob: Blob;
    filename: string;
  };
  stats?: {
    totalRows: number;
    exportedAt: Date;
    filters?: Record<string, unknown>;
  };
}

// ============================================================================
// 预定义导出模板
// ============================================================================

/**
 * 默认任务导出列
 */
export const DEFAULT_TASK_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'ID', width: 20 },
  { key: 'title', header: '标题', width: 40 },
  { key: 'description', header: '描述', width: 50 },
  { key: 'status', header: '状态', width: 12, type: 'text' },
  { key: 'priority', header: '优先级', width: 10, type: 'text' },
  { key: 'assignee', header: '负责人', width: 15 },
  { key: 'dueDate', header: '截止日期', width: 15, type: 'date', format: 'yyyy-mm-dd' },
  { key: 'tags', header: '标签', width: 20 },
  { key: 'createdAt', header: '创建时间', width: 18, type: 'date' },
  { key: 'updatedAt', header: '更新时间', width: 18, type: 'date' },
  { key: 'completedAt', header: '完成时间', width: 18, type: 'date' },
];

/**
 * 简化导出模板
 */
export const SIMPLE_EXPORT_TEMPLATE: ExportTemplate = {
  id: 'simple',
  name: '简化导出',
  description: '仅包含基本字段',
  columns: [
    { key: 'title', header: '任务', width: 50 },
    { key: 'status', header: '状态', width: 12 },
    { key: 'priority', header: '优先级', width: 10 },
    { key: 'assignee', header: '负责人', width: 15 },
    { key: 'dueDate', header: '截止日期', width: 15, type: 'date' },
  ],
};

/**
 * 详细导出模板
 */
export const DETAILED_EXPORT_TEMPLATE: ExportTemplate = {
  id: 'detailed',
  name: '详细导出',
  description: '包含所有字段和统计信息',
  columns: DEFAULT_TASK_COLUMNS,
  defaultOptions: {
    includeStats: true,
    freezeHeader: true,
    autoFilter: true,
  },
};

/**
 * 项目管理模板
 */
export const PROJECT_MANAGEMENT_TEMPLATE: ExportTemplate = {
  id: 'project-management',
  name: '项目管理导出',
  description: '适合项目管理的格式',
  columns: [
    { key: 'title', header: '任务名称', width: 40 },
    { key: 'status', header: '状态', width: 12 },
    { key: 'priority', header: '优先级', width: 10 },
    { key: 'assignee', header: '负责人', width: 15 },
    { key: 'dueDate', header: '截止日期', width: 15, type: 'date' },
    { key: 'tags', header: '标签', width: 20 },
    { key: 'progress', header: '进度%', width: 10, type: 'number' },
    { key: 'createdAt', header: '创建日期', width: 15, type: 'date' },
  ],
  customFields: [
    { id: 'progress', name: '进度', type: 'number', defaultValue: 0 },
    { id: 'estimatedHours', name: '预估工时', type: 'number' },
    { id: 'actualHours', name: '实际工时', type: 'number' },
  ],
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 状态到文本的映射
 */
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '评审中',
  done: '已完成',
};

/**
 * 优先级到文本的映射
 */
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

/**
 * 格式化日期
 */
function formatDate(date: Date | undefined | null, format: string = 'yyyy-mm-dd'): string {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('yyyy', String(year))
    .replace('mm', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('MM', minutes)
    .replace('SS', seconds);
}

/**
 * 获取任务的字段值
 */
function getTaskFieldValue(
  task: TaskWithCustomFields,
  key: string,
  customFields?: CustomFieldDefinition[]
): unknown {
  // 标准字段
  const standardFields: Record<string, () => unknown> = {
    id: () => task.id,
    title: () => task.title,
    description: () => task.description || '',
    status: () => STATUS_LABELS[task.status] || task.status,
    priority: () => PRIORITY_LABELS[task.priority] || task.priority,
    assignee: () => task.assignee || '',
    dueDate: () => task.dueDate,
    tags: () => task.tags.map(t => t.name).join(', '),
    createdAt: () => task.createdAt,
    updatedAt: () => task.updatedAt,
    completedAt: () => task.completedAt,
  };
  
  if (standardFields[key]) {
    return standardFields[key]();
  }
  
  // 自定义字段
  if (customFields && task.customFields) {
    const fieldDef = customFields.find(f => f.id === key);
    const fieldValue = task.customFields.find(f => f.fieldId === key);
    
    if (fieldValue) {
      return fieldValue.value;
    }
    
    if (fieldDef?.defaultValue !== undefined) {
      return fieldDef.defaultValue;
    }
  }
  
  return '';
}

/**
 * 准备 Excel 行数据
 */
function prepareExcelRow(
  task: TaskWithCustomFields,
  columns: ExportColumn[],
  customFields?: CustomFieldDefinition[]
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  
  for (const col of columns) {
    let value = getTaskFieldValue(task, col.key, customFields);
    
    // 应用自定义转换
    if (col.transform) {
      value = col.transform(value, task);
    }
    
    // 格式化日期
    if (col.type === 'date' && value instanceof Date) {
      value = formatDate(value, col.format);
    }
    
    // 格式化布尔值
    if (col.type === 'boolean') {
      value = value ? '是' : '否';
    }
    
    row[col.header] = value;
  }
  
  return row;
}

// ============================================================================
// Excel 导出核心函数
// ============================================================================

/**
 * 创建工作表并设置列宽
 */
function createWorksheet(
  data: Record<string, unknown>[],
  columns: ExportColumn[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data);
  
  // 设置列宽
  ws['!cols'] = columns.map(col => ({
    wch: col.width || 15,
  }));
  
  return ws;
}

/**
 * 添加统计信息工作表
 */
function addStatsSheet(
  workbook: XLSX.WorkBook,
  stats: TaskStats
): void {
  const statsData = [
    { 指标: '总任务数', 值: stats.total },
    { 指标: '已完成', 值: stats.done },
    { 指标: '进行中', 值: stats.inProgress },
    { 指标: '待办', 值: stats.todo },
    { 指标: '评审中', 值: stats.review },
    { 指标: '逾期任务', 值: stats.overdue },
    { 指标: '即将到期', 值: stats.dueSoon },
    { 指标: '完成率', 值: `${stats.completionRate}%` },
    { 指标: '高优先级', 值: stats.byPriority.high },
    { 指标: '中优先级', 值: stats.byPriority.medium },
    { 指标: '低优先级', 值: stats.byPriority.low },
  ];
  
  const ws = XLSX.utils.json_to_sheet(statsData);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, ws, '统计信息');
}

/**
 * 添加导出信息工作表
 */
function addExportInfoSheet(
  workbook: XLSX.WorkBook,
  options: ExcelExportOptions,
  rowCount: number
): void {
  const infoData = [
    { 项目: '导出时间', 内容: new Date().toLocaleString('zh-CN') },
    { 项目: '任务数量', 内容: rowCount },
    { 项目: '导出格式', 内容: 'Excel (XLSX)' },
    { 项目: '版本', 内容: '1.0.0' },
  ];
  
  const ws = XLSX.utils.json_to_sheet(infoData);
  ws['!cols'] = [{ wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, ws, '导出信息');
}

/**
 * 导出任务为 Excel（增强版）
 */
export function exportTasksToExcelEnhanced(
  tasks: TaskWithCustomFields[],
  options: ExcelExportOptions = {}
): Blob {
  const {
    sheetName = '任务列表',
    columns = DEFAULT_TASK_COLUMNS,
    includeHeaders = true,
    customFields,
    includeStats = false,
    freezeHeader = true,
    autoFilter = true,
  } = options;
  
  // 准备数据
  const data = tasks.map(task => prepareExcelRow(task, columns, customFields));
  
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  
  // 创建主工作表
  const worksheet = createWorksheet(data, columns);
  
  // 冻结首行
  if (freezeHeader && includeHeaders && data.length > 0) {
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  }
  
  // 自动筛选
  if (autoFilter && data.length > 0) {
    const range = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: data.length, c: columns.length - 1 },
    });
    worksheet['!autofilter'] = { ref: range };
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // 添加统计工作表
  if (includeStats) {
    const stats: TaskStats = {
      total: tasks.length,
      done: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      review: tasks.filter(t => t.status === 'review').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        return new Date(t.dueDate) < new Date();
      }).length,
      dueSoon: tasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const dueDate = new Date(t.dueDate);
        const hoursUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursUntilDue > 0 && hoursUntilDue <= 24;
      }).length,
      completionRate: tasks.length > 0
        ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
        : 0,
      byPriority: {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      },
    };
    addStatsSheet(workbook, stats);
  }
  
  // 添加导出信息工作表
  addExportInfoSheet(workbook, options, tasks.length);
  
  // 生成 Blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 使用模板导出
 */
export function exportWithTemplate(
  tasks: TaskWithCustomFields[],
  template: ExportTemplate,
  options: Partial<ExcelExportOptions> = {}
): Blob {
  const mergedOptions: ExcelExportOptions = {
    ...template.defaultOptions,
    ...options,
    columns: template.columns,
    customFields: template.customFields,
  };
  
  return exportTasksToExcelEnhanced(tasks, mergedOptions);
}

/**
 * 批量导出（增强版）
 */
export function batchExportEnhanced(
  tasks: TaskWithCustomFields[],
  options: ExcelExportOptions = {}
): EnhancedBatchExportResult {
  const filename = options.filename || `tasks-${formatDate(new Date(), 'yyyy-mm-dd')}.xlsx`;
  const blob = exportTasksToExcelEnhanced(tasks, options);
  
  return {
    excel: {
      blob,
      filename,
    },
    stats: {
      totalRows: tasks.length,
      exportedAt: new Date(),
    },
  };
}

// ============================================================================
// 自定义字段工具
// ============================================================================

/**
 * 创建自定义字段定义
 */
export function createCustomField(
  id: string,
  name: string,
  type: CustomFieldDefinition['type'],
  options?: Partial<CustomFieldDefinition>
): CustomFieldDefinition {
  return {
    id,
    name,
    type,
    ...options,
  };
}

/**
 * 验证自定义字段值
 */
export function validateCustomFieldValue(
  field: CustomFieldDefinition,
  value: unknown
): { valid: boolean; error?: string } {
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.name} 是必填字段` };
  }
  
  switch (field.type) {
    case 'number':
      if (typeof value !== 'number' && value !== undefined && value !== null) {
        return { valid: false, error: `${field.name} 必须是数字` };
      }
      break;
    case 'date':
      if (value && !(value instanceof Date) && isNaN(Date.parse(String(value)))) {
        return { valid: false, error: `${field.name} 必须是有效日期` };
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean' && value !== undefined && value !== null) {
        return { valid: false, error: `${field.name} 必须是布尔值` };
      }
      break;
    case 'select':
      if (field.options && value && !field.options.includes(String(value))) {
        return { valid: false, error: `${field.name} 必须是以下选项之一: ${field.options.join(', ')}` };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * 获取自定义字段默认值
 */
export function getCustomFieldDefaultValue(field: CustomFieldDefinition): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  
  switch (field.type) {
    case 'text':
      return '';
    case 'number':
      return 0;
    case 'date':
      return null;
    case 'boolean':
      return false;
    case 'select':
      return field.options?.[0] || '';
    default:
      return null;
  }
}

/**
 * 初始化任务的默认自定义字段
 */
export function initializeCustomFields(
  task: Task,
  fieldDefinitions: CustomFieldDefinition[]
): TaskWithCustomFields {
  return {
    ...task,
    customFields: fieldDefinitions.map(field => ({
      fieldId: field.id,
      value: getCustomFieldDefaultValue(field),
    })),
  };
}

// ============================================================================
// 导出列构建器
// ============================================================================

/**
 * 导出列构建器
 */
export class ExportColumnBuilder {
  private columns: ExportColumn[] = [];
  
  add(key: string, header: string, options?: Partial<ExportColumn>): this {
    this.columns.push({ key, header, ...options });
    return this;
  }
  
  addStandard(): this {
    this.columns.push(...DEFAULT_TASK_COLUMNS);
    return this;
  }
  
  addCustomField(field: CustomFieldDefinition, width?: number): this {
    this.columns.push({
      key: field.id,
      header: field.name,
      width: width || 15,
      type: field.type === 'select' ? 'text' : field.type,
    });
    return this;
  }
  
  build(): ExportColumn[] {
    return [...this.columns];
  }
  
  reset(): this {
    this.columns = [];
    return this;
  }
}

/**
 * 创建列构建器
 */
export function createColumnBuilder(): ExportColumnBuilder {
  return new ExportColumnBuilder();
}

// ============================================================================
// 下载工具
// ============================================================================

/**
 * 下载 Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 下载 Excel 文件
 */
export function downloadExcel(
  tasks: TaskWithCustomFields[],
  options: ExcelExportOptions = {}
): void {
  const blob = exportTasksToExcelEnhanced(tasks, options);
  const filename = options.filename || `tasks-${formatDate(new Date(), 'yyyy-mm-dd')}.xlsx`;
  downloadBlob(blob, filename);
}

// ============================================================================
// 导出配置管理
// ============================================================================

/**
 * 导出配置存储
 */
export class ExportConfigManager {
  private configs: Map<string, ExportTemplate> = new Map();
  
  constructor() {
    // 注册默认模板
    this.register(SIMPLE_EXPORT_TEMPLATE);
    this.register(DETAILED_EXPORT_TEMPLATE);
    this.register(PROJECT_MANAGEMENT_TEMPLATE);
  }
  
  register(template: ExportTemplate): void {
    this.configs.set(template.id, template);
  }
  
  get(id: string): ExportTemplate | undefined {
    return this.configs.get(id);
  }
  
  getAll(): ExportTemplate[] {
    return Array.from(this.configs.values());
  }
  
  remove(id: string): boolean {
    return this.configs.delete(id);
  }
}

/**
 * 全局配置管理器实例
 */
export const exportConfigManager = new ExportConfigManager();