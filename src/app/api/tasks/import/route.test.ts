/**
 * 任务批量导入 API 集成测试
 * @module api/tasks/import.test
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';

// Mock 依赖
vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: () => async () => null,
}));

vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: () => null,
  isAdmin: () => true,
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    audit: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock 任务存储
let mockTasks: any[] = [];

vi.mock('@/lib/data/tasks', () => ({
  createTask: vi.fn((data) => {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      history: [{
        timestamp: new Date().toISOString(),
        status: data.status || 'pending',
        changedBy: data.createdBy || 'user',
      }],
    };
    mockTasks.push(task);
    return task;
  }),
  getTasks: () => mockTasks,
}));

describe('POST /api/tasks/import', () => {
  beforeAll(() => {
    mockTasks = [];
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('CSV 解析', () => {
    it('应该成功解析基本的 CSV 格式', async () => {
      const csv = `title,description,type,priority,status,assignee
"任务1","描述1","feature","high","pending","architect"
"任务2","描述2","bug","medium","pending",""`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imported).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.tasks).toHaveLength(2);
    });

    it('应该支持无引号的 CSV', async () => {
      const csv = `title,description,type,priority
任务1,描述1,feature,high
任务2,描述2,bug,medium`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imported).toBe(2);
    });

    it('应该正确处理包含逗号和引号的字段', async () => {
      const csv = `title,description
"任务,1","包含""引号""的内容"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].title).toBe('任务,1');
      expect(data.tasks[0].description).toBe('包含"引号"的内容');
    });
  });

  describe('字段验证', () => {
    it('应该拒绝没有 title 列的 CSV', async () => {
      const csv = `description,type
"描述1","feature"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该拒绝空的 title', async () => {
      const csv = `title,description
"","描述1"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.failed).toBe(1);
      expect(data.errors[0].field).toBe('title');
    });

    it('应该使用默认值处理可选字段', async () => {
      const csv = `title
只有标题`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].type).toBe('other');
      expect(data.tasks[0].priority).toBe('medium');
      expect(data.tasks[0].status).toBe('pending');
    });
  });

  describe('类型映射', () => {
    it('应该支持多种任务类型格式', async () => {
      const csv = `title,type
"开发任务","feature"
"设计任务","design"
"研究任务","research"
"营销任务","marketing"
"其他任务","bug"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(5);
      expect(data.tasks[0].type).toBe('development'); // feature -> development
      expect(data.tasks[1].type).toBe('design');
      expect(data.tasks[2].type).toBe('research');
      expect(data.tasks[3].type).toBe('marketing');
      expect(data.tasks[4].type).toBe('other'); // bug -> other
    });

    it('应该支持中文类型', async () => {
      const csv = `title,type
"开发任务","开发"
"设计任务","设计"
"研究任务","研究"
"营销任务","营销"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks[0].type).toBe('development');
      expect(data.tasks[1].type).toBe('design');
      expect(data.tasks[2].type).toBe('research');
      expect(data.tasks[3].type).toBe('marketing');
    });

    it('应该支持中文优先级', async () => {
      const csv = `title,priority
"紧急任务","紧急"
"高优任务","高"
"中优任务","中"
"低优任务","低"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks[0].priority).toBe('urgent');
      expect(data.tasks[1].priority).toBe('high');
      expect(data.tasks[2].priority).toBe('medium');
      expect(data.tasks[3].priority).toBe('low');
    });

    it('应该支持中文状态', async () => {
      const csv = `title,status
"待处理任务","待处理"
"进行中任务","进行中"
"已完成任务","完成"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tasks[0].status).toBe('pending');
      expect(data.tasks[1].status).toBe('in_progress');
      expect(data.tasks[2].status).toBe('completed');
    });
  });

  describe('字段名映射', () => {
    it('应该支持中文列名', async () => {
      const csv = `标题,描述,类型,优先级,状态,分配人
"任务1","描述1","开发","高","待处理","架构师"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].title).toBe('任务1');
      expect(data.tasks[0].description).toBe('描述1');
      expect(data.tasks[0].assignee).toBe('架构师');
    });

    it('应该支持多种英文字段名', async () => {
      const csv = `name,content,category,urgency
"任务1","描述1","feature","high"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].title).toBe('任务1');
      expect(data.tasks[0].description).toBe('描述1');
    });
  });

  describe('错误处理', () => {
    it('应该拒绝空内容', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该拒绝只有标题行的 CSV', async () => {
      const csv = `title,description`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('应该部分成功并返回错误详情', async () => {
      const csv = `title,description
"有效任务","描述"
"","空标题"
"另一个有效任务","描述2"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(2);
      expect(data.failed).toBe(1);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0].row).toBe(3);
      expect(data.errors[0].field).toBe('title');
    });

    it('应该跳过空行', async () => {
      const csv = `title,description
"任务1","描述1"

"任务2","描述2"


"任务3","描述3"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(3);
      expect(data.failed).toBe(0);
    });
  });

  describe('JSON 格式支持', () => {
    it('应该支持 JSON 格式的 CSV 数据', async () => {
      const csv = `title,description
"任务1","描述1"`;

      const request = new NextRequest('http://localhost:3000/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
    });
  });
});

describe('GET /api/tasks/import', () => {
  it('应该返回导入模板和帮助信息', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.format).toBeDefined();
    expect(data.format.requiredFields).toContain('title');
    expect(data.template).toBeDefined();
    expect(data.template).toContain('title');
    expect(data.example).toBeDefined();
    expect(data.example.curl).toBeDefined();
  });
});
