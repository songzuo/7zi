/**
 * 导出 API - 增强版
 * 支持多种格式导出和高级筛选选项
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, TaskStats, TaskPriority, TaskStatus } from '../../../lib/tasks/types';
import {
  exportTasksToCSV,
  exportTasksToJSON,
  exportTasksToPDF,
  exportTasksToExcel,
  exportTasksToCSVWithOptions,
  exportTasksToJSONWithOptions,
  exportTasksToPDFWithOptions,
  exportTasksToExcelWithOptions,
  EnhancedExportOptions,
} from '../../../lib/export';

// 获取任务统计数据
async function getTaskStats(): Promise<TaskStats> {
  const { getTasks } = await import('../../../lib/tasks/api');
  const tasks = await getTasks();
  
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const review = tasks.filter(t => t.status === 'review').length;
  
  const now = new Date();
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    return new Date(t.dueDate) < now;
  }).length;
  
  const dueSoon = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const dueDate = new Date(t.dueDate);
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue > 0 && hoursUntilDue <= 24;
  }).length;
  
  return {
    total,
    done,
    inProgress,
    todo,
    review,
    overdue,
    dueSoon,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    byPriority: {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    },
  };
}

// 从查询参数构建导出选项
function buildExportOptions(searchParams: URLSearchParams): Partial<EnhancedExportOptions> {
  const options: Partial<EnhancedExportOptions> = {};

  // 日期范围
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate && endDate) {
    options.dateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  }

  // 优先级
  const priority = searchParams.get('priority') as TaskPriority | null;
  if (priority && ['high', 'medium', 'low'].includes(priority)) {
    options.priority = priority;
  }

  // 状态
  const status = searchParams.get('status') as TaskStatus | null;
  if (status && ['todo', 'in_progress', 'review', 'done'].includes(status)) {
    options.status = status;
  }

  // 负责人
  const assignee = searchParams.get('assignee');
  if (assignee) {
    options.assignee = assignee;
  }

  // 标签
  const tags = searchParams.get('tags');
  if (tags) {
    options.tags = tags.split(',').filter(Boolean);
  }

  // 是否包含已完成
  const includeCompleted = searchParams.get('includeCompleted');
  if (includeCompleted !== null) {
    options.includeCompleted = includeCompleted === 'true';
  }

  return options;
}

/**
 * GET: 导出任务数据
 * 查询参数:
 * - format: json | csv | pdf | excel (默认 json)
 * - type: tasks | stats | all (默认 tasks)
 * - startDate: ISO 日期字符串
 * - endDate: ISO 日期字符串
 * - priority: high | medium | low
 * - status: todo | in_progress | review | done
 * - assignee: 负责人 ID
 * - tags: 逗号分隔的标签 ID
 * - includeCompleted: true | false
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const format = (searchParams.get('format') || 'json') as 'json' | 'csv' | 'pdf' | 'excel';
  const type = searchParams.get('type') || 'tasks';
  
  try {
    const { getTasks } = await import('../../../lib/tasks/api');
    const tasks = await getTasks();
    const stats = await getTaskStats();
    const options = buildExportOptions(searchParams);

    // 验证格式
    if (!['json', 'csv', 'pdf', 'excel'].includes(format)) {
      return NextResponse.json({ error: 'Unsupported format. Use: json, csv, pdf, excel' }, { status: 400 });
    }

    // 根据类型导出
    switch (type) {
      case 'tasks': {
        let blob: Blob;
        let filename: string;
        const dateStr = new Date().toISOString().split('T')[0];

        switch (format) {
          case 'json':
            blob = exportTasksToJSONWithOptions(tasks, options);
            filename = `tasks-export-${dateStr}.json`;
            break;
          case 'csv':
            blob = exportTasksToCSVWithOptions(tasks, options);
            filename = `tasks-export-${dateStr}.csv`;
            break;
          case 'pdf':
            blob = exportTasksToPDFWithOptions(tasks, stats, options);
            filename = `tasks-export-${dateStr}.pdf`;
            break;
          case 'excel':
            blob = exportTasksToExcelWithOptions(tasks, options);
            filename = `tasks-export-${dateStr}.xlsx`;
            break;
        }

        return new NextResponse(blob, {
          headers: {
            'Content-Type': getContentType(format),
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      case 'stats': {
        return NextResponse.json({
          success: true,
          data: stats,
          exportedAt: new Date().toISOString(),
        });
      }

      case 'all': {
        const exportData = {
          tasks,
          stats,
          exportedAt: new Date().toISOString(),
          options: Object.keys(options).length > 0 ? options : undefined,
        };

        if (format === 'json') {
          return NextResponse.json(exportData);
        }

        // 其他格式返回完整数据
        return NextResponse.json({
          success: true,
          data: exportData,
          format,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid type. Use: tasks, stats, all' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

/**
 * POST: 高级导出
 * 支持自定义数据和复杂筛选
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, type, data, options, taskIds } = body;

    // 获取任务
    const { getTasks } = await import('../../../lib/tasks/api');
    let tasks = await getTasks();

    // 如果指定了任务 ID，只导出这些任务
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      tasks = tasks.filter(t => taskIds.includes(t.id));
    }

    const exportOptions: Partial<EnhancedExportOptions> = options || {};

    switch (type) {
      case 'tasks': {
        let blob: Blob;
        const dateStr = new Date().toISOString().split('T')[0];

        switch (format) {
          case 'json':
            blob = exportTasksToJSONWithOptions(tasks, exportOptions);
            break;
          case 'csv':
            blob = exportTasksToCSVWithOptions(tasks, exportOptions);
            break;
          case 'pdf':
            blob = exportTasksToPDFWithOptions(tasks, undefined, exportOptions);
            break;
          case 'excel':
            blob = exportTasksToExcelWithOptions(tasks, exportOptions);
            break;
          default:
            return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
        }

        return new NextResponse(blob, {
          headers: {
            'Content-Type': getContentType(format),
            'Content-Disposition': `attachment; filename="tasks-export-${dateStr}.${getFileExtension(format)}"`,
          },
        });
      }

      case 'custom': {
        if (!data) {
          return NextResponse.json({ error: 'No data provided for custom export' }, { status: 400 });
        }

        if (format === 'json') {
          return NextResponse.json({
            success: true,
            data,
            exportedAt: new Date().toISOString(),
          });
        }

        if (format === 'csv') {
          const csvContent = arrayToCSV(data);
          return new NextResponse('\ufeff' + csvContent, {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': `attachment; filename="export-${new Date().toISOString().split('T')[0]}.csv"`,
            },
          });
        }

        return NextResponse.json({ error: 'Custom export only supports JSON and CSV formats' }, { status: 400 });
      }

      case 'batch': {
        // 批量导出多种格式
        const formats = body.formats as string[];
        if (!formats || !Array.isArray(formats) || formats.length === 0) {
          return NextResponse.json({ error: 'Formats array is required for batch export' }, { status: 400 });
        }

        const results: Record<string, string> = {};
        const dateStr = new Date().toISOString().split('T')[0];

        // 返回下载链接信息（客户端需要分别请求每个格式）
        for (const fmt of formats) {
          if (['json', 'csv', 'pdf', 'excel'].includes(fmt)) {
            results[fmt] = `/api/export?format=${fmt}&type=tasks`;
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Use the provided URLs to download each format',
          downloadUrls: results,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid type. Use: tasks, custom, batch' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to process export' },
      { status: 500 }
    );
  }
}

// 辅助函数
function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    json: 'application/json; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return contentTypes[format] || 'application/octet-stream';
}

function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    json: 'json',
    csv: 'csv',
    pdf: 'pdf',
    excel: 'xlsx',
  };
  return extensions[format] || format;
}

function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}