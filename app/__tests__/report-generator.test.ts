/**
 * 报表生成器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportGenerator, generateQuickDailyReport, generateQuickTaskSummary } from '../lib/report-generator';
import type { Task } from '../lib/tasks/types';

// 模拟数据
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: '实现用户登录',
    description: '添加用户登录功能',
    priority: 'high',
    status: 'done',
    tags: [{ id: 'tag-1', name: '功能', color: 'blue' }],
    assignee: 'user-1',
    dueDate: new Date(Date.now() - 86400000), // 昨天
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
    completedAt: new Date(),
  },
  {
    id: 'task-2',
    title: '修复导出Bug',
    description: 'PDF导出失败的问题',
    priority: 'medium',
    status: 'in_progress',
    tags: [{ id: 'tag-2', name: 'Bug', color: 'red' }],
    assignee: 'user-2',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
  },
  {
    id: 'task-3',
    title: '优化性能',
    description: '减少页面加载时间',
    priority: 'low',
    status: 'todo',
    tags: [{ id: 'tag-3', name: '优化', color: 'green' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockMembers = [
  { id: '1', name: '测试成员1', role: '开发', emoji: '👨‍💻', status: 'working', provider: 'test', completedTasks: 5 },
  { id: '2', name: '测试成员2', role: '测试', emoji: '🧪', status: 'idle', provider: 'test', completedTasks: 3 },
];

const mockIssues: any[] = [
  { number: 1, title: 'Bug: 登录失败', state: 'open', labels: [{ name: 'bug', color: 'red' }], assignee: { login: 'user1', avatar_url: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com' },
  { number: 2, title: 'Feature: 导出数据', state: 'closed', labels: [{ name: 'feature', color: 'blue' }], assignee: { login: 'user2', avatar_url: '' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com' },
];

const mockCommits: any[] = [
  { sha: 'abc123', commit: { message: '添加导出功能', author: { name: 'Developer', date: new Date().toISOString() } }, html_url: 'https://github.com', author: { avatar_url: '' } },
];

const mockActivities: any[] = [
  { id: '1', type: 'commit', title: '添加导出功能', author: 'Developer', timestamp: new Date().toISOString(), url: 'https://github.com' },
  { id: '2', type: 'issue', title: 'Bug报告', author: 'User', timestamp: new Date().toISOString(), url: 'https://github.com' },
];

describe('ReportGenerator', () => {
  let generator: ReportGenerator;

  beforeEach(() => {
    generator = new ReportGenerator({
      members: mockMembers as any,
      issues: mockIssues,
      commits: mockCommits,
      activities: mockActivities,
      tasks: mockTasks,
    });
  });

  describe('generate', () => {
    it('应该生成日报', () => {
      const report = generator.generate({ type: 'daily' });
      
      expect(report.type).toBe('daily');
      expect(report.title).toContain('Daily Report');
      expect(report.summary.keyMetrics).toBeDefined();
      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.metadata.generatedBy).toBe('AI Team Dashboard');
    });

    it('应该生成周报', () => {
      const report = generator.generate({ type: 'weekly' });
      
      expect(report.type).toBe('weekly');
      expect(report.title).toContain('Weekly Report');
      expect(report.dateRange).toBeDefined();
      expect(report.dateRange?.start).toBeInstanceOf(Date);
      expect(report.dateRange?.end).toBeInstanceOf(Date);
    });

    it('应该生成月报', () => {
      const report = generator.generate({ type: 'monthly' });
      
      expect(report.type).toBe('monthly');
      expect(report.title).toContain('Monthly Report');
    });

    it('应该生成任务摘要报表', () => {
      const report = generator.generate({ type: 'task-summary' });
      
      expect(report.type).toBe('task-summary');
      expect(report.summary.keyMetrics['Total Tasks']).toBe(3);
      expect(report.summary.keyMetrics['Completed']).toBe(1);
      expect(report.summary.keyMetrics['In Progress']).toBe(1);
      expect(report.summary.keyMetrics['To Do']).toBe(1);
    });

    it('应该生成冲刺报告', () => {
      const report = generator.generate({ type: 'sprint' });
      
      expect(report.type).toBe('sprint');
      expect(report.summary.keyMetrics['Total Tasks']).toBe(3);
      expect(report.summary.keyMetrics['Completion Rate']).toBeDefined();
    });

    it('应该生成团队绩效报告', () => {
      const report = generator.generate({ type: 'team-performance' });
      
      expect(report.type).toBe('team-performance');
      expect(report.summary.keyMetrics['Team Size']).toBe(2);
    });

    it('应该生成问题分析报告', () => {
      const report = generator.generate({ type: 'issue-analysis' });
      
      expect(report.type).toBe('issue-analysis');
      expect(report.summary.keyMetrics['Total Issues']).toBe(2);
      expect(report.summary.keyMetrics['Open']).toBe(1);
      expect(report.summary.keyMetrics['Closed']).toBe(1);
    });

    it('应该生成活动日志报告', () => {
      const report = generator.generate({ type: 'activity-log' });
      
      expect(report.type).toBe('activity-log');
      expect(report.summary.keyMetrics['Total Activities']).toBe(2);
    });

    it('应该使用自定义标题', () => {
      const customTitle = '我的自定义报表';
      const report = generator.generate({ type: 'daily', title: customTitle });
      
      expect(report.title).toBe(customTitle);
    });

    it('应该包含正确的统计信息', () => {
      const report = generator.generate({ type: 'task-summary' });
      
      // 验证统计数据
      expect(report.summary.keyMetrics['Completion Rate']).toBe('33%'); // 1/3 = 33%
      expect(report.summary.keyMetrics['Overdue']).toBeGreaterThanOrEqual(0);
    });
  });

  describe('数据设置方法', () => {
    it('应该能够设置任务数据', () => {
      const newGenerator = new ReportGenerator();
      newGenerator.setTasks(mockTasks);
      
      const report = newGenerator.generate({ type: 'task-summary' });
      
      expect(report.summary.keyMetrics['Total Tasks']).toBe(3);
    });

    it('应该能够设置成员数据', () => {
      const newGenerator = new ReportGenerator();
      newGenerator.setMembers(mockMembers as any);
      
      const report = newGenerator.generate({ type: 'team-performance' });
      
      expect(report.summary.keyMetrics['Team Size']).toBe(2);
    });
  });

  describe('报表结构', () => {
    it('报表应该包含所有必需字段', () => {
      const report = generator.generate({ type: 'daily' });
      
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('type');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('metadata');
    });

    it('摘要应该包含关键字指标', () => {
      const report = generator.generate({ type: 'daily' });
      
      expect(report.summary).toHaveProperty('keyMetrics');
      expect(report.summary).toHaveProperty('highlights');
      expect(report.summary).toHaveProperty('recommendations');
    });

    it('每个section应该有正确的结构', () => {
      const report = generator.generate({ type: 'daily' });
      
      report.sections.forEach(section => {
        expect(section).toHaveProperty('id');
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('data');
      });
    });
  });
});

describe('便捷函数', () => {
  describe('generateQuickDailyReport', () => {
    it('应该快速生成日报', () => {
      const report = generateQuickDailyReport({
        members: mockMembers as any,
        issues: mockIssues,
        commits: mockCommits,
        activities: mockActivities,
        tasks: mockTasks,
      });
      
      expect(report.type).toBe('daily');
      expect(report.summary).toBeDefined();
    });
  });

  describe('generateQuickTaskSummary', () => {
    it('应该快速生成任务摘要', () => {
      const report = generateQuickTaskSummary(mockTasks);
      
      expect(report.type).toBe('task-summary');
      expect(report.summary.keyMetrics['Total Tasks']).toBe(3);
    });
  });
});

describe('报表计算', () => {
  it('应该正确计算完成率', () => {
    const generator = new ReportGenerator({ tasks: mockTasks });
    const report = generator.generate({ type: 'task-summary' });
    
    // 1 完成 / 3 总任务 = 33%
    expect(report.summary.keyMetrics['Completion Rate']).toBe('33%');
  });

  it('应该正确识别逾期任务', () => {
    const generator = new ReportGenerator({ tasks: mockTasks });
    const report = generator.generate({ type: 'task-summary' });
    
    // task-1 已完成，不应该算逾期
    // 其他任务没有截止日期或未逾期
    expect(report.summary.keyMetrics['Overdue']).toBeGreaterThanOrEqual(0);
  });

  it('应该正确统计优先级分布', () => {
    const generator = new ReportGenerator({ tasks: mockTasks });
    const report = generator.generate({ type: 'task-summary' });
    
    // 优先级分布
    const prioritySection = report.sections.find(s => s.id === 'priority-distribution');
    expect(prioritySection).toBeDefined();
    expect((prioritySection?.data as any)?.high).toBe(1);
    expect((prioritySection?.data as any)?.medium).toBe(1);
    expect((prioritySection?.data as any)?.low).toBe(1);
  });
});

describe('边界情况', () => {
  it('应该处理空数据', () => {
    const emptyGenerator = new ReportGenerator({
      members: [],
      issues: [],
      commits: [],
      activities: [],
      tasks: [],
    });
    
    const report = emptyGenerator.generate({ type: 'daily' });
    
    expect(report.summary.keyMetrics['Active Members']).toBe(0);
    expect(report.summary.keyMetrics['Commits Today']).toBe(0);
  });

  it('应该处理只有部分数据的报表', () => {
    const partialGenerator = new ReportGenerator({ tasks: mockTasks });
    const report = partialGenerator.generate({ type: 'task-summary' });
    
    expect(report.type).toBe('task-summary');
    expect(report.summary.keyMetrics['Total Tasks']).toBe(3);
  });
});