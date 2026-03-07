/**
 * 报表 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../app/api/reports/route';
import { NextRequest } from 'next/server';

// Mock 任务 API
vi.mock('@/lib/tasks/api', () => ({
  getTasks: vi.fn().mockResolvedValue([
    {
      id: 'task-1',
      title: '测试任务1',
      description: '描述1',
      priority: 'high',
      status: 'done',
      tags: [{ id: 'tag-1', name: '功能', color: 'blue' }],
      assignee: 'user-1',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: '测试任务2',
      description: '描述2',
      priority: 'medium',
      status: 'in_progress',
      tags: [{ id: 'tag-2', name: 'Bug', color: 'red' }],
      assignee: 'user-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: '测试任务3',
      description: '描述3',
      priority: 'low',
      status: 'todo',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}));

describe('Reports API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reports', () => {
    it('应该返回可用的报表类型列表', async () => {
      const url = new URL('http://localhost/api/reports');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('reportTypes');
      expect(data.reportTypes.length).toBeGreaterThan(0);
      
      // 验证报表类型结构
      const reportType = data.reportTypes[0];
      expect(reportType).toHaveProperty('type');
      expect(reportType).toHaveProperty('description');
    });

    it('应该生成日报', async () => {
      const url = new URL('http://localhost/api/reports?type=daily');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('daily');
      expect(data.report).toHaveProperty('summary');
      expect(data.report).toHaveProperty('sections');
    });

    it('应该生成周报', async () => {
      const url = new URL('http://localhost/api/reports?type=weekly');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('weekly');
      expect(data.report.dateRange).toBeDefined();
    });

    it('应该生成任务摘要报表', async () => {
      const url = new URL('http://localhost/api/reports?type=task-summary');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('task-summary');
      expect(data.report.summary.keyMetrics['Total Tasks']).toBe(3);
    });

    it('应该生成团队绩效报表', async () => {
      const url = new URL('http://localhost/api/reports?type=team-performance');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('team-performance');
    });

    it('应该生成问题分析报表', async () => {
      const url = new URL('http://localhost/api/reports?type=issue-analysis');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('issue-analysis');
    });

    it('应该生成活动日志报表', async () => {
      const url = new URL('http://localhost/api/reports?type=activity-log');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.type).toBe('activity-log');
    });

    it('应该拒绝无效的报表类型', async () => {
      const url = new URL('http://localhost/api/reports?type=invalid');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('validTypes');
    });
  });

  describe('POST /api/reports', () => {
    it('应该生成自定义日报', async () => {
      const request = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ type: 'daily', title: '我的日报' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.title).toBe('我的日报');
    });

    it('应该支持日期范围过滤', async () => {
      const startDate = new Date(Date.now() - 7 * 86400000).toISOString();
      const endDate = new Date().toISOString();
      
      const request = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          type: 'weekly',
          dateRange: { start: startDate, end: endDate },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.report.dateRange).toBeDefined();
    });

    it('应该返回 CSV 格式的报表', async () => {
      const request = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ type: 'daily', format: 'csv' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');
      expect(text).toContain('Metric');
      expect(text).toContain('Value');
    });

    it('应该拒绝缺少报表类型的请求', async () => {
      const request = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('应该拒绝无效的报表类型', async () => {
      const request = new NextRequest('http://localhost/api/reports', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('validTypes');
    });
  });

  describe('报表数据验证', () => {
    it('报表应该包含所有必需字段', async () => {
      const url = new URL('http://localhost/api/reports?type=daily');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      const report = data.report;
      
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('type');
      expect(report).toHaveProperty('title');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('sections');
      expect(report).toHaveProperty('metadata');
    });

    it('摘要应该包含关键字指标', async () => {
      const url = new URL('http://localhost/api/reports?type=task-summary');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      const summary = data.report.summary;
      
      expect(summary).toHaveProperty('keyMetrics');
      expect(summary).toHaveProperty('highlights');
      expect(summary).toHaveProperty('recommendations');
    });

    it('应该正确计算任务统计', async () => {
      const url = new URL('http://localhost/api/reports?type=task-summary');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      const metrics = data.report.summary.keyMetrics;
      
      expect(metrics['Total Tasks']).toBe(3);
      expect(metrics['Completed']).toBe(1);
      expect(metrics['In Progress']).toBe(1);
      expect(metrics['To Do']).toBe(1);
      expect(metrics['Completion Rate']).toBe('33%');
    });
  });

  describe('报表类型描述', () => {
    it('应该为每种报表类型提供描述', async () => {
      const url = new URL('http://localhost/api/reports');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      data.reportTypes.forEach((reportType: any) => {
        expect(reportType.description).toBeTruthy();
        expect(reportType.description.length).toBeGreaterThan(0);
      });
    });
  });
});