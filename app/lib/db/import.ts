/**
 * 数据导入模块
 * 支持 CSV 和 JSON 格式的任务数据导入
 * @module lib/db/import
 */

import { Task, TaskTag, TaskPriority, TaskStatus, DEFAULT_TAGS } from '../tasks/types';
import { createTask, getAllTasks } from './tasks.repository';

/**
 * 导入结果接口
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
  tasks?: Task[];
}

/**
 * 导入错误接口
 */
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * CSV 导入选项
 */
export interface ImportOptions {
  skipErrors?: boolean; // 跳过错误行继续导入
  updateExisting?: boolean; // 更新已存在的任务
  defaultPriority?: TaskPriority;
  defaultStatus?: TaskStatus;
  tagMapping?: Record<string, string>; // CSV 标签名 -> 系统标签 ID
}

/**
 * CSV 行数据接口
 */
interface CSVRow {
  [key: string]: string;
}

/**
 * JSON 导入数据格式
 */
export interface JSONImportData {
  tasks?: TaskImportItem[];
  tags?: TagImportItem[];
}

/**
 * 任务导入项
 */
export interface TaskImportItem {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: string[]; // 标签名称数组
  assignee?: string;
  dueDate?: string; // ISO 日期字符串
}

/**
 * 标签导入项
 */
export interface TagImportItem {
  id: string;
  name: string;
  color?: string;
}

/**
 * 解析 CSV 文本为行数组
 * @param csvText CSV 文本内容
 * @returns 解析后的行数组
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  // 解析表头
  const headers = parseCSVLine(lines[0]);
  
  // 解析数据行
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header.trim().toLowerCase()] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * 解析单行 CSV
 * 支持引号包裹的字段
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (inQuotes) {
      if (char === '"') {
        // 检查是否是转义引号
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
 * 验证并规范化优先级
 */
function normalizePriority(value: string | undefined, defaultPriority: TaskPriority): TaskPriority {
  if (!value) return defaultPriority;
  
  const normalized = value.toLowerCase().trim();
  if (['high', '高', '紧急', 'urgent'].includes(normalized)) return 'high';
  if (['medium', '中', '普通', 'normal'].includes(normalized)) return 'medium';
  if (['low', '低', '低优先级'].includes(normalized)) return 'low';
  
  return defaultPriority;
}

/**
 * 验证并规范化状态
 */
function normalizeStatus(value: string | undefined, defaultStatus: TaskStatus): TaskStatus {
  if (!value) return defaultStatus;
  
  const normalized = value.toLowerCase().trim();
  if (['todo', '待办', 'pending', 'new'].includes(normalized)) return 'todo';
  if (['in_progress', '进行中', 'in progress', 'progress', 'doing'].includes(normalized)) return 'in_progress';
  if (['review', '评审', '评审中', 'in review'].includes(normalized)) return 'review';
  if (['done', '完成', 'completed', 'finished', 'closed'].includes(normalized)) return 'done';
  
  return defaultStatus;
}

/**
 * 解析标签字符串为数组
 * 支持逗号、分号、竖线分隔
 */
function parseTags(tagString: string, tagMapping?: Record<string, string>): TaskTag[] {
  if (!tagString) return [];
  
  const tagNames = tagString.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
  const tags: TaskTag[] = [];
  
  for (const name of tagNames) {
    // 先检查映射
    if (tagMapping?.[name]) {
      const mappedTag = DEFAULT_TAGS.find(t => t.id === tagMapping[name]);
      if (mappedTag) {
        tags.push(mappedTag);
        continue;
      }
    }
    
    // 查找默认标签
    const defaultTag = DEFAULT_TAGS.find(
      t => t.name.toLowerCase() === name.toLowerCase() || t.id.toLowerCase() === name.toLowerCase()
    );
    
    if (defaultTag) {
      tags.push(defaultTag);
    } else {
      // 创建自定义标签
      tags.push({
        id: `custom_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        color: 'gray',
      });
    }
  }
  
  return tags;
}

/**
 * 解析日期字符串
 */
function parseDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * 从 CSV 行创建任务导入项
 */
function csvRowToTaskItem(
  row: CSVRow,
  options: ImportOptions
): { task: TaskImportItem; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const rowNum = parseInt(row._rowNum || '0', 10);
  
  // 标题是必须的
  const title = row.title || row.name || row['任务名称'] || row['标题'];
  if (!title) {
    errors.push({
      row: rowNum,
      field: 'title',
      message: '任务标题不能为空',
    });
  }
  
  const task: TaskImportItem = {
    title: title || '未命名任务',
    description: row.description || row.desc || row['描述'] || row['说明'],
    priority: normalizePriority(
      row.priority || row['优先级'],
      options.defaultPriority || 'medium'
    ),
    status: normalizeStatus(
      row.status || row['状态'],
      options.defaultStatus || 'todo'
    ),
    assignee: row.assignee || row['负责人'] || row['执行人'],
    dueDate: row.due_date || row.duedate || row['截止日期'] || row['到期日'],
    tags: (row.tags || row['标签'])
      ? row.tags || row['标签']
      : undefined,
  };
  
  return { task, errors };
}

/**
 * 导入 CSV 数据
 * @param csvText CSV 文本内容
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importFromCSV(
  csvText: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  const importedTasks: Task[] = [];
  let imported = 0;
  let failed = 0;

  try {
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, message: 'CSV 文件为空或格式不正确' }],
      };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = { ...rows[i], _rowNum: i + 2 }; // +2 因为第1行是表头，行号从1开始
      
      try {
        const { task: taskItem, errors: rowErrors } = csvRowToTaskItem(row as CSVRow & { _rowNum: string }, options);
        
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          if (!options.skipErrors) {
            failed++;
            continue;
          }
        }
        
        // 解析标签
        const tags = taskItem.tags 
          ? parseTags(taskItem.tags, options.tagMapping)
          : [];
        
        // 创建任务
        const task = await createTask({
          title: taskItem.title,
          description: taskItem.description,
          priority: taskItem.priority,
          status: taskItem.status,
          tags,
          assignee: taskItem.assignee,
          dueDate: parseDate(taskItem.dueDate),
        });
        
        importedTasks.push(task);
        imported++;
      } catch (error) {
        failed++;
        errors.push({
          row: i + 2,
          message: error instanceof Error ? error.message : '未知错误',
        });
        
        if (!options.skipErrors) {
          break;
        }
      }
    }

    return {
      success: failed === 0 || (options.skipErrors && imported > 0),
      imported,
      failed,
      errors,
      tasks: importedTasks,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      failed: 0,
      errors: [{
        row: 0,
        message: error instanceof Error ? error.message : 'CSV 解析失败',
      }],
    };
  }
}

/**
 * 导入 JSON 数据
 * @param jsonText JSON 文本内容
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importFromJSON(
  jsonText: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  const importedTasks: Task[] = [];
  let imported = 0;
  let failed = 0;

  try {
    const data: JSONImportData = JSON.parse(jsonText);
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, message: 'JSON 数据格式不正确，需要包含 tasks 数组' }],
      };
    }

    for (let i = 0; i < data.tasks.length; i++) {
      const taskItem = data.tasks[i];
      
      try {
        // 验证必填字段
        if (!taskItem.title) {
          errors.push({
            row: i + 1,
            field: 'title',
            message: '任务标题不能为空',
          });
          
          if (!options.skipErrors) {
            failed++;
            continue;
          }
        }

        // 解析标签
        const tags = taskItem.tags 
          ? parseTags(taskItem.tags.join(','), options.tagMapping)
          : [];
        
        // 创建任务
        const task = await createTask({
          title: taskItem.title || '未命名任务',
          description: taskItem.description,
          priority: taskItem.priority || options.defaultPriority || 'medium',
          status: taskItem.status || options.defaultStatus || 'todo',
          tags,
          assignee: taskItem.assignee,
          dueDate: parseDate(taskItem.dueDate),
        });
        
        importedTasks.push(task);
        imported++;
      } catch (error) {
        failed++;
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : '未知错误',
        });
        
        if (!options.skipErrors) {
          break;
        }
      }
    }

    return {
      success: failed === 0 || (options.skipErrors && imported > 0),
      imported,
      failed,
      errors,
      tasks: importedTasks,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      failed: 0,
      errors: [{
        row: 0,
        message: 'JSON 解析失败: ' + (error instanceof Error ? error.message : '未知错误'),
      }],
    };
  }
}

/**
 * 自动检测格式并导入
 * @param content 文件内容
 * @param filename 文件名（用于检测格式）
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importData(
  content: string,
  filename: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (extension === 'csv') {
    return importFromCSV(content, options);
  }
  
  if (extension === 'json') {
    return importFromJSON(content, options);
  }
  
  // 尝试自动检测
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return importFromJSON(content, options);
  }
  
  // 默认当作 CSV
  return importFromCSV(content, options);
}

/**
 * 生成 CSV 模板
 * @returns CSV 模板字符串
 */
export function generateCSVTemplate(): string {
  return `title,description,priority,status,tags,assignee,due_date
"示例任务1","这是一个示例任务描述",high,todo,"feature,urgent","Executor","2024-12-31"
"示例任务2","另一个任务",medium,in_progress,"bug","Tester","2024-12-25"
"示例任务3","文档编写",low,done,"documentation","架构师",""`;
}

/**
 * 生成 JSON 模板
 * @returns JSON 模板字符串
 */
export function generateJSONTemplate(): string {
  return JSON.stringify({
    tasks: [
      {
        title: "示例任务1",
        description: "这是一个示例任务描述",
        priority: "high",
        status: "todo",
        tags: ["feature", "urgent"],
        assignee: "Executor",
        dueDate: "2024-12-31T00:00:00.000Z"
      },
      {
        title: "示例任务2",
        description: "另一个任务",
        priority: "medium",
        status: "in_progress",
        tags: ["bug"],
        assignee: "Tester",
        dueDate: "2024-12-25T00:00:00.000Z"
      }
    ]
  }, null, 2);
}

/**
 * 验证导入文件格式
 * @param content 文件内容
 * @param filename 文件名
 * @returns 验证结果
 */
export function validateImportFile(
  content: string,
  filename: string
): { valid: boolean; format: 'csv' | 'json' | 'unknown'; error?: string } {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (extension === 'csv') {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return { valid: false, format: 'csv', error: 'CSV 文件至少需要包含表头和一行数据' };
    }
    return { valid: true, format: 'csv' };
  }
  
  if (extension === 'json') {
    try {
      const data = JSON.parse(content);
      if (!data.tasks || !Array.isArray(data.tasks)) {
        return { valid: false, format: 'json', error: 'JSON 需要包含 tasks 数组' };
      }
      return { valid: true, format: 'json' };
    } catch {
      return { valid: false, format: 'json', error: 'JSON 格式不正确' };
    }
  }
  
  return { valid: false, format: 'unknown', error: '不支持的文件格式，请使用 CSV 或 JSON' };
}
