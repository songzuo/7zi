/**
 * 任务批量导入 API
 * 支持 CSV 格式导入任务
 * 
 * @module api/tasks/import
 * @description 批量导入任务端点，支持 CSV 格式
 * 
 * @example
 * // 导入 CSV 文件
 * POST /api/tasks/import
 * Content-Type: text/csv
 * 
 * title,description,type,priority,status,assignee
 * "任务1","描述1","feature","high","pending","architect"
 * "任务2","描述2","bug","medium","pending",""
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { validationError, successResponse } from '@/lib/middleware';
import { createTask, getTasks } from '@/lib/data/tasks';
import type { Task, TaskType, TaskStatus, TaskPriority } from '@/lib/types/task-types';

// CSRF 中间件
const csrfMiddleware = createCsrfMiddleware();

// 允许的任务类型
const VALID_TYPES: TaskType[] = ['development', 'design', 'research', 'marketing', 'other'];
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES: TaskStatus[] = ['pending', 'assigned', 'in_progress', 'completed'];

// CSV 导入字段映射（支持多种格式）
const FIELD_MAPPINGS: Record<string, string> = {
  // 标题
  'title': 'title',
  '标题': 'title',
  'name': 'title',
  
  // 描述
  'description': 'description',
  '描述': 'description',
  'desc': 'description',
  'content': 'description',
  
  // 类型
  'type': 'type',
  '类型': 'type',
  'category': 'type',
  
  // 优先级
  'priority': 'priority',
  '优先级': 'priority',
  'urgency': 'priority',
  
  // 状态
  'status': 'status',
  '状态': 'status',
  
  // 分配人
  'assignee': 'assignee',
  '分配人': 'assignee',
  'assigned_to': 'assignee',
  'owner': 'assignee',
};

/**
 * 导入结果接口
 */
interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, string>;
  }>;
  tasks: Task[];
}

/**
 * 解析 CSV 行，处理引号和逗号
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 标准化字段名
 */
function normalizeFieldName(field: string): string {
  const normalized = field.toLowerCase().trim();
  return FIELD_MAPPINGS[normalized] || normalized;
}

/**
 * 验证并标准化任务数据
 */
function validateTaskData(
  row: Record<string, string>,
  rowNum: number
): { valid: boolean; data?: Partial<Task>; error?: { field?: string; message: string } } {
  const errors: Array<{ field?: string; message: string }> = [];
  
  // 标题验证（必填）
  const title = row['title'];
  if (!title || title.trim() === '') {
    return { valid: false, error: { field: 'title', message: '标题是必填字段' } };
  }
  
  // 类型验证
  let type: TaskType = 'other';
  if (row['type']) {
    const normalizedType = row['type'].toLowerCase().trim();
    // 支持更多格式
    const typeMap: Record<string, TaskType> = {
      'feature': 'development',
      'features': 'development',
      '开发': 'development',
      'development': 'development',
      'dev': 'development',
      'design': 'design',
      '设计': 'design',
      'research': 'research',
      '研究': 'research',
      'marketing': 'marketing',
      '营销': 'marketing',
      'bug': 'other',
      'refactor': 'development',
      'test': 'development',
      'docs': 'research',
      'other': 'other',
      '其他': 'other',
    };
    type = typeMap[normalizedType] || 'other';
  }
  
  // 优先级验证
  let priority: TaskPriority = 'medium';
  if (row['priority']) {
    const normalizedPriority = row['priority'].toLowerCase().trim();
    if (VALID_PRIORITIES.includes(normalizedPriority as TaskPriority)) {
      priority = normalizedPriority as TaskPriority;
    } else {
      // 支持数字和中文
      const priorityMap: Record<string, TaskPriority> = {
        'high': 'high',
        '高': 'high',
        '1': 'high',
        'medium': 'medium',
        '中': 'medium',
        '2': 'medium',
        'low': 'low',
        '低': 'low',
        '3': 'low',
        'urgent': 'urgent',
        '紧急': 'urgent',
        '0': 'urgent',
      };
      priority = priorityMap[normalizedPriority] || 'medium';
    }
  }
  
  // 状态验证
  let status: TaskStatus = 'pending';
  if (row['status']) {
    const normalizedStatus = row['status'].toLowerCase().trim();
    if (VALID_STATUSES.includes(normalizedStatus as TaskStatus)) {
      status = normalizedStatus as TaskStatus;
    } else {
      // 支持中文
      const statusMap: Record<string, TaskStatus> = {
        'pending': 'pending',
        '待处理': 'pending',
        'assigned': 'assigned',
        '已分配': 'assigned',
        'in_progress': 'in_progress',
        '进行中': 'in_progress',
        'completed': 'completed',
        '完成': 'completed',
      };
      status = statusMap[normalizedStatus] || 'pending';
    }
  }
  
  // 分配人（可选）
  const assignee = row['assignee']?.trim() || undefined;
  
  return {
    valid: true,
    data: {
      title: title.trim(),
      description: row['description']?.trim() || '',
      type,
      priority,
      status,
      assignee,
    },
  };
}

/**
 * POST /api/tasks/import - 批量导入任务
 */
export async function POST(request: NextRequest) {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 认证检查（可选）
  const token = extractToken(request);
  let userId = 'anonymous';
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      userId = payload.sub;
    }
  }

  // 获取请求内容
  const contentType = request.headers.get('content-type') || '';
  let csvContent = '';
  
  try {
    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file || !(file instanceof File)) {
        return validationError('请上传 CSV 文件', 'file', request);
      }
      
      csvContent = await file.text();
    } else if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      // 直接 CSV 内容
      csvContent = await request.text();
    } else {
      // 尝试解析 JSON 或文本
      const text = await request.text();
      
      // 检查是否是 JSON 格式
      try {
        const json = JSON.parse(text);
        if (json.csv) {
          csvContent = json.csv;
        } else if (json.data) {
          csvContent = json.data;
        } else {
          csvContent = text;
        }
      } catch {
        csvContent = text;
      }
    }
  } catch (error) {
    return validationError('无法读取请求内容', 'content', request);
  }

  if (!csvContent || csvContent.trim() === '') {
    return validationError('CSV 内容为空', 'csv', request);
  }

  // 解析 CSV
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    return validationError('CSV 文件必须包含标题行和至少一行数据', 'csv', request);
  }

  // 解析标题行
  const headerFields = parseCSVLine(lines[0]);
  const normalizedHeaders = headerFields.map(normalizeFieldName);

  // 验证标题行
  if (!normalizedHeaders.includes('title')) {
    return validationError('CSV 必须包含 "title" 列', 'headers', request);
  }

  // 初始化结果
  const result: ImportResult = {
    success: true,
    total: lines.length - 1,
    imported: 0,
    failed: 0,
    errors: [],
    tasks: [],
  };

  // 处理每一行数据
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const rowNum = i + 1;
    
    if (!line.trim()) continue;
    
    try {
      const values = parseCSVLine(line);
      
      // 构建行数据对象
      const rowData: Record<string, string> = {};
      normalizedHeaders.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      // 验证数据
      const validation = validateTaskData(rowData, rowNum);
      
      if (!validation.valid) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          field: validation.error?.field,
          message: validation.error?.message || '数据验证失败',
          data: rowData,
        });
        continue;
      }
      
      // 创建任务
      try {
        const newTask = createTask({
          title: validation.data!.title!,
          description: validation.data!.description || '',
          type: validation.data!.type || 'other',
          priority: validation.data!.priority || 'medium',
          status: validation.data!.status || 'pending',
          assignee: validation.data!.assignee,
          createdBy: userId as 'user' | 'ai',
        });
        
        result.imported++;
        result.tasks.push(newTask);
      } catch (createError) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: `创建任务失败: ${createError instanceof Error ? createError.message : '未知错误'}`,
          data: rowData,
        });
      }
    } catch (parseError) {
      result.failed++;
      result.errors.push({
        row: rowNum,
        message: `解析行失败: ${parseError instanceof Error ? parseError.message : '格式错误'}`,
      });
    }
  }

  // 设置成功标志
  result.success = result.imported > 0;

  // 记录审计日志
  apiLogger.audit('Tasks imported', {
    total: result.total,
    imported: result.imported,
    failed: result.failed,
    importedBy: userId,
  });

  // 返回结果
  if (result.failed > 0 && result.imported === 0) {
    return NextResponse.json(
      {
        ...result,
        success: false,
        message: '所有任务导入失败',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ...result,
    message: result.failed > 0 
      ? `成功导入 ${result.imported} 个任务，${result.failed} 个失败`
      : `成功导入 ${result.imported} 个任务`,
  });
}

/**
 * GET /api/tasks/import - 获取导入模板和帮助
 */
export async function GET() {
  const template = `title,description,type,priority,status,assignee
"示例任务1","这是一个示例任务描述","feature","high","pending","architect"
"示例任务2","修复某个bug","bug","medium","pending",""
"示例任务3","重构代码","refactor","low","pending","developer"`;

  return NextResponse.json({
    success: true,
    message: '任务导入 API',
    format: {
      type: 'CSV',
      requiredFields: ['title'],
      optionalFields: ['description', 'type', 'priority', 'status', 'assignee'],
      fieldTypes: {
        type: ['feature', 'bug', 'refactor', 'test', 'docs', 'development', 'design', 'research', 'marketing', 'other'],
        priority: ['low', 'medium', 'high', 'urgent'],
        status: ['pending', 'assigned', 'in_progress', 'completed'],
      },
    },
    template,
    example: {
      curl: `curl -X POST http://localhost:3000/api/tasks/import \\
  -H "Content-Type: text/csv" \\
  -d 'title,description,type,priority
"我的任务","任务描述","feature","high"'`,
    },
  });
}
