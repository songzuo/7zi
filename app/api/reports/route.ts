/**
 * 报表生成 API - 支持多种报表类型和格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  ReportGenerator, 
  ReportType, 
  ReportConfig,
  generateQuickDailyReport,
  generateQuickWeeklyReport,
  generateQuickTaskSummary,
  generateQuickTeamPerformanceReport
} from '@/lib/report-generator';
import type { Task, TaskStats } from '@/lib/tasks/types';

// 报表类型
const VALID_REPORT_TYPES: ReportType[] = [
  'daily',
  'weekly',
  'monthly',
  'sprint',
  'team-performance',
  'task-summary',
  'issue-analysis',
  'activity-log'
];

// 获取任务数据
async function getTasks(): Promise<Task[]> {
  const { getTasks: fetchTasks } = await import('@/lib/tasks/api');
  return fetchTasks();
}

// 获取任务统计
async function getTaskStats(): Promise<TaskStats> {
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

// 获取模拟数据（用于演示）
function getMockMembers() {
  return [
    { id: '1', name: '咨询师', role: 'Research', emoji: '📚', status: 'working', provider: 'minimax', completedTasks: 12 },
    { id: '2', name: '架构师', role: 'Design', emoji: '🏗️', status: 'busy', provider: 'claude', completedTasks: 8 },
    { id: '3', name: 'Executor', role: 'Implementation', emoji: '⚡', status: 'working', provider: 'volcengine', completedTasks: 15 },
    { id: '4', name: '测试员', role: 'Testing', emoji: '🧪', status: 'idle', provider: 'minimax', completedTasks: 10 },
    { id: '5', name: '设计师', role: 'UI/UX', emoji: '🎨', status: 'working', provider: 'claude', completedTasks: 7 },
  ];
}

function getMockIssues() {
  return [
    { number: 1, title: 'Bug: Login fails', state: 'open', labels: [{ name: 'bug', color: 'red' }], assignee: { login: 'user1', avatar_url: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com' },
    { number: 2, title: 'Feature: Export data', state: 'closed', labels: [{ name: 'feature', color: 'blue' }], assignee: { login: 'user2', avatar_url: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com' },
  ];
}

function getMockCommits() {
  return [
    { sha: 'abc123', commit: { message: 'Add export feature', author: { name: 'Developer', date: new Date().toISOString() } }, html_url: 'https://github.com', author: { avatar_url: '' } },
  ];
}

function getMockActivities() {
  return [
    { id: '1', type: 'commit', title: 'Add export feature', author: 'Developer', timestamp: new Date().toISOString(), url: 'https://github.com' },
    { id: '2', type: 'issue', title: 'Bug report', author: 'User', timestamp: new Date().toISOString(), url: 'https://github.com' },
  ];
}

// GET /api/reports - 获取报表列表
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as ReportType | null;
  
  if (!type) {
    // 返回可用报表类型列表
    return NextResponse.json({
      reportTypes: VALID_REPORT_TYPES.map(t => ({
        type: t,
        description: getReportTypeDescription(t),
      })),
    });
  }
  
  if (!VALID_REPORT_TYPES.includes(type)) {
    return NextResponse.json(
      { error: 'Invalid report type', validTypes: VALID_REPORT_TYPES },
      { status: 400 }
    );
  }
  
  try {
    // 获取数据
    const tasks = await getTasks();
    const stats = await getTaskStats();
    
    // 对于需要完整数据的报表，使用模拟数据补充
    const members = getMockMembers();
    const issues = getMockIssues();
    const commits = getMockCommits();
    const activities = getMockActivities();
    
    // 生成报表
    const generator = new ReportGenerator({
      members: members as any,
      issues: issues as any,
      commits: commits as any,
      activities: activities as any,
      tasks,
    });
    
    const report = generator.generate({ type });
    
    return NextResponse.json({
      success: true,
      report,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// POST /api/reports - 生成自定义报表
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, dateRange, format = 'json' } = body as {
      type: ReportType;
      title?: string;
      dateRange?: { start: string; end: string };
      format?: 'json' | 'csv' | 'pdf';
    };
    
    if (!type || !VALID_REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type', validTypes: VALID_REPORT_TYPES },
        { status: 400 }
      );
    }
    
    // 获取数据
    const tasks = await getTasks();
    const members = getMockMembers();
    const issues = getMockIssues();
    const commits = getMockCommits();
    const activities = getMockActivities();
    
    // 配置报表
    const config: ReportConfig = {
      type,
      title,
      dateRange: dateRange ? {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      } : undefined,
      format,
    };
    
    // 生成报表
    const generator = new ReportGenerator({
      members: members as any,
      issues: issues as any,
      commits: commits as any,
      activities: activities as any,
      tasks,
    });
    
    const report = generator.generate(config);
    
    // 根据格式返回
    if (format === 'csv') {
      // 导出 CSV 格式
      const summaryData = Object.entries(report.summary.keyMetrics).map(([key, value]) => ({
        Metric: key,
        Value: value,
      }));
      
      const headers = Object.keys(summaryData[0] || {});
      const csvRows = [
        headers.join(','),
        ...summaryData.map(row =>
          headers.map(h => {
            const value = row[h as keyof typeof row];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ];
      
      return new NextResponse('\ufeff' + csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      report,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// 获取报表类型描述
function getReportTypeDescription(type: ReportType): string {
  const descriptions: Record<ReportType, string> = {
    'daily': '日报 - 每日活动和进度汇总',
    'weekly': '周报 - 每周工作总结和统计',
    'monthly': '月报 - 每月趋势和绩效分析',
    'sprint': '冲刺报告 - Sprint 进度和燃尽图',
    'team-performance': '团队绩效报告 - 成员表现分析',
    'task-summary': '任务摘要报告 - 任务状态总览',
    'issue-analysis': '问题分析报告 - Issue 统计分析',
    'activity-log': '活动日志报告 - 活动记录查询',
  };
  
  return descriptions[type];
}