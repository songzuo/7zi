/**
 * 导出工具 - 支持 PDF、CSV、JSON、Excel 格式导出数据
 */

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { AIMember, GitHubIssue, GitHubCommit, ActivityItem } from '../dashboard/page';
import type { Task, TaskStats } from './tasks/types';

// ============================================================================
// 类型定义
// ============================================================================

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeStats?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ReportData {
  members: AIMember[];
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  tasks?: Task[];
  stats: {
    totalMembers: number;
    working: number;
    busy: number;
    idle: number;
    offline: number;
    openIssues: number;
    closedIssues: number;
  };
  taskStats?: TaskStats;
  generatedAt: Date;
}

// ============================================================================
// CSV 导出函数
// ============================================================================

/**
 * 将数据转换为 CSV 字符串
 */
function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];
  
  return csvRows.join('\n');
}

/**
 * 下载 CSV 文件
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  const csv = arrayToCSV(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出成员数据为 CSV
 */
export function exportMembersCSV(members: AIMember[]): void {
  const data = members.map(member => ({
    ID: member.id,
    名称: member.name,
    角色: member.role,
    Emoji: member.emoji,
    状态: member.status,
    提供商: member.provider,
    当前任务: member.currentTask || '',
    已完成任务: member.completedTasks,
  }));
  
  downloadCSV(data, 'ai-team-members');
}

/**
 * 导出 Issues 数据为 CSV
 */
export function exportIssuesCSV(issues: GitHubIssue[]): void {
  const data = issues.map(issue => ({
    编号: issue.number,
    标题: issue.title,
    状态: issue.state,
    标签: issue.labels.map(l => l.name).join(';'),
    负责人: issue.assignee?.login || '',
    创建时间: issue.created_at,
    更新时间: issue.updated_at,
    URL: issue.html_url,
  }));
  
  downloadCSV(data, 'github-issues');
}

/**
 * 导出 Commits 数据为 CSV
 */
export function exportCommitsCSV(commits: GitHubCommit[]): void {
  const data = commits.map(commit => ({
    SHA: commit.sha,
    提交信息: commit.commit.message,
    作者: commit.commit.author.name,
    日期: commit.commit.author.date,
    URL: commit.html_url,
  }));
  
  downloadCSV(data, 'github-commits');
}

/**
 * 导出活动日志为 CSV
 */
export function exportActivitiesCSV(activities: ActivityItem[]): void {
  const data = activities.map(activity => ({
    ID: activity.id,
    类型: activity.type,
    标题: activity.title,
    作者: activity.author,
    时间: activity.timestamp,
    URL: activity.url,
  }));
  
  downloadCSV(data, 'activity-log');
}

/**
 * 导出任务数据为 CSV
 */
export function exportTasksCSV(tasks: Task[]): void {
  const data = tasks.map(task => ({
    ID: task.id,
    标题: task.title,
    描述: task.description || '',
    优先级: task.priority,
    状态: task.status,
    标签: task.tags.map(t => t.name).join(';'),
    负责人: task.assignee || '',
    截止日期: task.dueDate ? new Date(task.dueDate).toISOString() : '',
    创建时间: new Date(task.createdAt).toISOString(),
    更新时间: new Date(task.updatedAt).toISOString(),
    完成时间: task.completedAt ? new Date(task.completedAt).toISOString() : '',
  }));
  
  downloadCSV(data, 'tasks');
}

// ============================================================================
// JSON 导出函数
// ============================================================================

/**
 * 下载 JSON 文件
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出完整报告为 JSON
 */
export function exportReportJSON(reportData: ReportData): void {
  const exportData = {
    ...reportData,
    generatedAt: reportData.generatedAt.toISOString(),
    exportedBy: 'AI Team Dashboard',
    version: '1.0.0',
  };
  
  downloadJSON(exportData, `report-${formatDateForFilename(reportData.generatedAt)}`);
}

/**
 * 导出成员数据为 JSON
 */
export function exportMembersJSON(members: AIMember[]): void {
  downloadJSON(members, 'ai-team-members');
}

/**
 * 导出任务数据为 JSON
 */
export function exportTasksJSON(tasks: Task[]): void {
  const data = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
  }));
  
  downloadJSON(data, 'tasks');
}

// ============================================================================
// PDF 导出函数
// ============================================================================

/**
 * 导出数据为 PDF
 */
export function exportToPDF(
  members: AIMember[],
  issues: GitHubIssue[],
  commits: GitHubCommit[],
  stats: {
    totalMembers: number;
    working: number;
    busy: number;
    idle: number;
    offline: number;
    openIssues: number;
    closedIssues: number;
  }
): void {
  const doc = new jsPDF();
  let yPos = 20;
  
  // 标题
  doc.setFontSize(20);
  doc.text('AI Team Dashboard Report', 105, yPos, { align: 'center' });
  yPos += 15;
  
  // 生成日期
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, yPos, { align: 'center' });
  yPos += 15;
  
  // 统计信息
  doc.setFontSize(14);
  doc.text('Team Statistics', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  const statsText = [
    `Total Members: ${stats.totalMembers}`,
    `Working: ${stats.working}`,
    `Busy: ${stats.busy}`,
    `Idle: ${stats.idle}`,
    `Offline: ${stats.offline}`,
    `Open Issues: ${stats.openIssues}`,
    `Closed Issues: ${stats.closedIssues}`,
  ];
  
  statsText.forEach(text => {
    doc.text(text, 25, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // 成员列表
  doc.setFontSize(14);
  doc.text('Team Members', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(9);
  members.forEach(member => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const statusEmoji = member.status === 'working' ? '🔥' : 
                       member.status === 'busy' ? '⚡' : 
                       member.status === 'idle' ? '😊' : '⚫';
    
    const line = `${statusEmoji} ${member.name} (${member.role}) - ${member.provider} - ${member.completedTasks} completed`;
    doc.text(line, 25, yPos);
    yPos += 5;
    
    if (member.currentTask) {
      doc.text(`   Current: ${member.currentTask}`, 25, yPos);
      yPos += 5;
    }
  });
  
  yPos += 10;
  
  // Issues 列表
  if (issues.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text('GitHub Issues', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(8);
    issues.slice(0, 20).forEach(issue => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const status = issue.state === 'open' ? 'OPEN' : 'DONE';
      const assignee = issue.assignee ? `@${issue.assignee.login}` : 'Unassigned';
      const line = `[${status}] #${issue.number} ${issue.title.substring(0, 50)} - ${assignee}`;
      doc.text(line, 25, yPos);
      yPos += 5;
    });
  }
  
  // 保存 PDF
  doc.save(`ai-team-report-${formatDateForFilename(new Date())}.pdf`);
}

/**
 * 导出任务报告 PDF
 */
export function exportTasksPDF(tasks: Task[], stats: TaskStats): void {
  const doc = new jsPDF();
  let yPos = 20;
  
  // 标题
  doc.setFontSize(20);
  doc.text('Task Report', 105, yPos, { align: 'center' });
  yPos += 10;
  
  // 生成日期
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, yPos, { align: 'center' });
  yPos += 15;
  
  // 统计信息
  doc.setFontSize(14);
  doc.text('Task Statistics', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  const statsLines = [
    `Total Tasks: ${stats.total}`,
    `Completed: ${stats.done} (${stats.completionRate}%)`,
    `In Progress: ${stats.inProgress}`,
    `To Do: ${stats.todo}`,
    `In Review: ${stats.review}`,
    `Overdue: ${stats.overdue}`,
    `Due Soon: ${stats.dueSoon}`,
  ];
  
  statsLines.forEach(line => {
    doc.text(line, 25, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // 优先级分布
  doc.setFontSize(12);
  doc.text('Priority Distribution', 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.text(`High: ${stats.byPriority.high} | Medium: ${stats.byPriority.medium} | Low: ${stats.byPriority.low}`, 25, yPos);
  yPos += 15;
  
  // 任务列表
  doc.setFontSize(14);
  doc.text('Task List', 20, yPos);
  yPos += 10;
  
  const statusIcons: Record<string, string> = {
    todo: '[ ]',
    in_progress: '[~]',
    review: '[?]',
    done: '[X]',
  };
  
  const priorityIcons: Record<string, string> = {
    high: '!!!',
    medium: '!!',
    low: '!',
  };
  
  doc.setFontSize(8);
  tasks.forEach(task => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const icon = statusIcons[task.status] || '[ ]';
    const priority = priorityIcons[task.priority] || '!';
    const tags = task.tags.map(t => t.name).join(', ');
    
    doc.text(`${icon} ${priority} ${task.title}`, 25, yPos);
    yPos += 4;
    
    if (task.description) {
      doc.text(`     ${task.description.substring(0, 80)}${task.description.length > 80 ? '...' : ''}`, 25, yPos);
      yPos += 4;
    }
    
    if (tags) {
      doc.setTextColor(100, 100, 100);
      doc.text(`     Tags: ${tags}`, 25, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 4;
    }
    
    yPos += 3;
  });
  
  doc.save(`task-report-${formatDateForFilename(new Date())}.pdf`);
}

/**
 * 导出完整报告（包含所有数据）
 */
export function exportFullReport(
  members: AIMember[],
  issues: GitHubIssue[],
  commits: GitHubCommit[],
  activities: ActivityItem[],
  stats: {
    totalMembers: number;
    working: number;
    busy: number;
    idle: number;
    offline: number;
    openIssues: number;
    closedIssues: number;
  }
): void {
  // 导出 PDF 报告
  exportToPDF(members, issues, commits, stats);
  
  // 导出 CSV 文件
  exportMembersCSV(members);
  exportIssuesCSV(issues);
}

// ============================================================================
// 通用导出函数
// ============================================================================

/**
 * 根据格式导出数据
 */
export function exportData(
  data: unknown[],
  format: ExportFormat,
  filename: string
): void {
  switch (format) {
    case 'csv':
      downloadCSV(data as Record<string, unknown>[], filename);
      break;
    case 'json':
      downloadJSON(data, filename);
      break;
    case 'pdf':
      // PDF 需要特殊处理，这里只支持特定数据类型
      console.warn('PDF export requires specific data types. Use exportToPDF or exportTasksPDF instead.');
      break;
  }
}

/**
 * 导出完整报告数据
 */
export function exportCompleteReport(
  reportData: ReportData,
  format: ExportFormat = 'json'
): void {
  const filename = `complete-report-${formatDateForFilename(reportData.generatedAt)}`;
  
  switch (format) {
    case 'json':
      exportReportJSON(reportData);
      break;
    case 'pdf':
      exportToPDF(
        reportData.members,
        reportData.issues,
        reportData.commits,
        reportData.stats
      );
      if (reportData.tasks && reportData.taskStats) {
        exportTasksPDF(reportData.tasks, reportData.taskStats);
      }
      break;
    case 'csv':
      // 导出多个 CSV 文件
      exportMembersCSV(reportData.members);
      exportIssuesCSV(reportData.issues);
      exportCommitsCSV(reportData.commits);
      exportActivitiesCSV(reportData.activities);
      if (reportData.tasks) {
        exportTasksCSV(reportData.tasks);
      }
      break;
  }
}

// ============================================================================
// Blob-based 导出函数 (用于测试和 API 兼容)
// ============================================================================

/**
 * 导出任务数据为 CSV Blob
 * 别名: exportTasksCSV (向后兼容)
 */
export function exportTasksToCSV(tasks: Task[]): Blob {
  const data = tasks.map(task => ({
    ID: task.id,
    Title: task.title,
    Status: task.status,
    Priority: task.priority,
    Assignee: task.assignee || '',
    DueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
    Tags: task.tags.map(t => t.name).join(';'),
    CreatedAt: new Date(task.createdAt).toISOString(),
    UpdatedAt: new Date(task.updatedAt).toISOString(),
  }));
  
  const csv = arrayToCSV(data);
  return new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * 导出任务数据为 JSON Blob
 * 别名: exportTasksJSON (向后兼容)
 */
export function exportTasksToJSON(tasks: Task[]): Blob {
  const data = tasks.map(task => ({
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
    completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
  }));
  
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json;charset=utf-8;' });
}

/**
 * 导出任务数据为 PDF Blob
 * 别名: exportTasksPDF (向后兼容)
 */
export function exportTasksToPDF(tasks: Task[]): Blob {
  const doc = new jsPDF();
  let yPos = 20;
  
  // 标题
  doc.setFontSize(20);
  doc.text('Task Report', 105, yPos, { align: 'center' });
  yPos += 10;
  
  // 生成日期
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, yPos, { align: 'center' });
  yPos += 15;
  
  // 统计信息
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    review: tasks.filter(t => t.status === 'review').length,
  };
  
  doc.setFontSize(14);
  doc.text('Task Statistics', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  const statsLines = [
    `Total Tasks: ${stats.total}`,
    `Completed: ${stats.done}`,
    `In Progress: ${stats.inProgress}`,
    `To Do: ${stats.todo}`,
    `In Review: ${stats.review}`,
  ];
  
  statsLines.forEach(line => {
    doc.text(line, 25, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // 任务列表
  doc.setFontSize(14);
  doc.text('Task List', 20, yPos);
  yPos += 10;
  
  const statusIcons: Record<string, string> = {
    todo: '[ ]',
    in_progress: '[~]',
    review: '[?]',
    done: '[X]',
  };
  
  const priorityIcons: Record<string, string> = {
    high: '!!!',
    medium: '!!',
    low: '!',
  };
  
  doc.setFontSize(8);
  tasks.forEach(task => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    const icon = statusIcons[task.status] || '[ ]';
    const priority = priorityIcons[task.priority] || '!';
    
    doc.text(`${icon} ${priority} ${task.title}`, 25, yPos);
    yPos += 5;
  });
  
  // 返回 Blob
  const pdfOutput = doc.output('blob');
  return pdfOutput;
}

/**
 * 导出任务数据为 Excel Blob
 */
export function exportTasksToExcel(tasks: Task[]): Blob {
  const data = tasks.map(task => ({
    ID: task.id,
    Title: task.title,
    Description: task.description || '',
    Status: task.status,
    Priority: task.priority,
    Assignee: task.assignee || '',
    DueDate: task.dueDate ? new Date(task.dueDate).toISOString() : '',
    Tags: task.tags.map(t => t.name).join(', '),
    CreatedAt: new Date(task.createdAt).toISOString(),
    UpdatedAt: new Date(task.updatedAt).toISOString(),
    CompletedAt: task.completedAt ? new Date(task.completedAt).toISOString() : '',
  }));
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 导出任务为 Excel (别名，保持一致性)
 */
export const exportTasksExcel = exportTasksToExcel;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化日期用于文件名
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * 复制数据到剪贴板
 */
export async function copyToClipboard(data: unknown): Promise<boolean> {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// ============================================================================
// 增强导出功能 - 支持高级选项
// ============================================================================

/**
 * 增强导出选项
 */
export interface EnhancedExportOptions extends ExportOptions {
  includeCompleted?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: Task['priority'];
  status?: Task['status'];
  assignee?: string;
  tags?: string[];
}

/**
 * 根据选项过滤任务
 */
export function filterTasksForExport(
  tasks: Task[],
  options: EnhancedExportOptions
): Task[] {
  let filtered = [...tasks];

  // 按日期范围过滤
  if (options.dateRange) {
    const { start, end } = options.dateRange;
    filtered = filtered.filter(task => {
      const createdAt = new Date(task.createdAt);
      return createdAt >= start && createdAt <= end;
    });
  }

  // 按优先级过滤
  if (options.priority) {
    filtered = filtered.filter(task => task.priority === options.priority);
  }

  // 按状态过滤
  if (options.status) {
    filtered = filtered.filter(task => task.status === options.status);
  }

  // 按负责人过滤
  if (options.assignee) {
    filtered = filtered.filter(task => task.assignee === options.assignee);
  }

  // 按标签过滤
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter(task =>
      options.tags!.some(tagId => task.tags.some(tag => tag.id === tagId))
    );
  }

  // 是否包含已完成任务
  if (!options.includeCompleted) {
    filtered = filtered.filter(task => task.status !== 'done');
  }

  return filtered;
}

/**
 * 导出任务报告为 Excel (增强版，支持选项)
 */
export function exportTasksToExcelWithOptions(
  tasks: Task[],
  options: EnhancedExportOptions = {}
): Blob {
  const filteredTasks = filterTasksForExport(tasks, options);
  return exportTasksToExcel(filteredTasks);
}

/**
 * 导出任务报告为 CSV (增强版，支持选项)
 */
export function exportTasksToCSVWithOptions(
  tasks: Task[],
  options: EnhancedExportOptions = {}
): Blob {
  const filteredTasks = filterTasksForExport(tasks, options);
  return exportTasksToCSV(filteredTasks);
}

/**
 * 导出任务报告为 JSON (增强版，支持选项)
 */
export function exportTasksToJSONWithOptions(
  tasks: Task[],
  options: EnhancedExportOptions = {}
): Blob {
  const filteredTasks = filterTasksForExport(tasks, options);
  return exportTasksToJSON(filteredTasks);
}

/**
 * 导出任务报告为 PDF (增强版，支持选项)
 */
export function exportTasksToPDFWithOptions(
  tasks: Task[],
  stats?: TaskStats,
  options: EnhancedExportOptions = {}
): Blob {
  const filteredTasks = filterTasksForExport(tasks, options);

  if (stats) {
    // 使用提供的统计数据
    return exportTasksPDF(filteredTasks, stats);
  }

  // 计算过滤后任务的统计
  const computedStats: TaskStats = {
    total: filteredTasks.length,
    done: filteredTasks.filter(t => t.status === 'done').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    todo: filteredTasks.filter(t => t.status === 'todo').length,
    review: filteredTasks.filter(t => t.status === 'review').length,
    overdue: filteredTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
    dueSoon: filteredTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      const hoursUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntilDue > 0 && hoursUntilDue <= 24;
    }).length,
    completionRate: 0,
    byPriority: {
      high: filteredTasks.filter(t => t.priority === 'high').length,
      medium: filteredTasks.filter(t => t.priority === 'medium').length,
      low: filteredTasks.filter(t => t.priority === 'low').length,
    },
  };
  computedStats.completionRate = filteredTasks.length > 0
    ? Math.round((computedStats.done / filteredTasks.length) * 100)
    : 0;

  return exportTasksPDF(filteredTasks, computedStats);
}

/**
 * 批量导出 - 一次性生成多种格式
 */
export interface BatchExportResult {
  csv?: Blob;
  json?: Blob;
  pdf?: Blob;
  excel?: Blob;
}

export function batchExportTasks(
  tasks: Task[],
  formats: ExportFormat[],
  options: EnhancedExportOptions = {}
): BatchExportResult {
  const result: BatchExportResult = {};

  for (const format of formats) {
    switch (format) {
      case 'csv':
        result.csv = exportTasksToCSVWithOptions(tasks, options);
        break;
      case 'json':
        result.json = exportTasksToJSONWithOptions(tasks, options);
        break;
      case 'pdf':
        result.pdf = exportTasksToPDFWithOptions(tasks, undefined, options);
        break;
      case 'excel':
        result.excel = exportTasksToExcelWithOptions(tasks, options);
        break;
    }
  }

  return result;
}

/**
 * 下载 Blob 文件
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
