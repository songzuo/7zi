/**
 * @fileoverview 任务导入 API 测试
 * @module test/api/tasks-import
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/tasks/import/route';
import { taskStore } from '@/lib/data/tasks';

// Mock next headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
  cookies: vi.fn(() => Promise.resolve({ 
    get: vi.fn(), 
    set: vi.fn(), 
    delete: vi.fn() 
  })),
}));

// Mock CSRF middleware
vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn(() => vi.fn(() => null)),
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => new Headers()),
}));

// Mock auth
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn((user) => user?.role === 'admin'),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Tasks Import API', () => {
  beforeEach(() => {
    // 重置存储
    vi.clearAllMocks();
  });

  describe('POST /api/tasks/import', () => {
    
    // ============================================
    // JSON 格式测试
    // ============================================
    
    it('should import tasks from JSON with csv field', async () => {
      const csvContent = `title,description,type,priority
任务1,描述1,development,high
任务2,描述2,design,medium`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imported).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0].title).toBe('任务1');
      expect(data.tasks[1].title).toBe('任务2');
    });

    it('should import tasks from JSON with data field', async () => {
      const csvContent = `title,description
Data任务,Data描述`;
      
      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].title).toBe('Data任务');
    });

    // ============================================
    // 字段验证测试
    // ============================================

    it('should validate required title field', async () => {
      const csvContent = `description,type
没有标题的行,development`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined(); // 验证错误有 error 字段
    });

    it('should normalize task type to valid values', async () => {
      const csvContent = `title,type
任务A,invalid_type
任务B,DEVELOPMENT
任务C,Design`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(3);
      expect(data.tasks[0].type).toBe('other'); // invalid -> other
      expect(data.tasks[1].type).toBe('development'); // normalized
      expect(data.tasks[2].type).toBe('design'); // normalized
    });

    it('should normalize priority to valid values', async () => {
      const csvContent = `title,priority
任务A,urgent
任务B,INVALID
任务C,HIGH`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(3);
      expect(data.tasks[0].priority).toBe('urgent');
      expect(data.tasks[1].priority).toBe('medium'); // invalid -> medium
      expect(data.tasks[2].priority).toBe('high');
    });

    // ============================================
    // 批量插入测试
    // ============================================

    it('should handle large batch imports', async () => {
      const rows = ['title,description'];
      for (let i = 1; i <= 100; i++) {
        rows.push(`批量任务${i},批量描述${i}`);
      }
      const csvContent = rows.join('\n');

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(100);
      expect(data.tasks).toHaveLength(100);
    });

    // ============================================
    // CSV 解析测试
    // ============================================

    it('should handle CSV with quoted fields', async () => {
      const csvContent = `title,description
"带引号的标题","带逗号,的描述"
"另一个标题","带""引号""的描述"`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(2);
      expect(data.tasks[0].description).toBe('带逗号,的描述');
      expect(data.tasks[1].description).toBe('带"引号"的描述');
    });

    it('should support Chinese column names', async () => {
      const csvContent = `标题,描述,类型,优先级
中文任务,中文描述,development,high`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.tasks[0].title).toBe('中文任务');
      expect(data.tasks[0].description).toBe('中文描述');
    });

    it('should skip empty rows', async () => {
      const csvContent = `title,description
任务1,描述1

任务2,描述2
,`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 只统计非空行作为 total
      expect(data.imported).toBeGreaterThanOrEqual(1);
    });

    // ============================================
    // 错误处理测试
    // ============================================

    it('should return error for empty CSV', async () => {
      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: '' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return error for CSV with only headers', async () => {
      const csvContent = `title,description`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return error for CSV without title column', async () => {
      const csvContent = `description,priority
描述1,high`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should collect multiple row errors', async () => {
      const csvContent = `title,description
,描述1
,描述2
有效任务,描述3`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(1);
      expect(data.failed).toBe(2);
      expect(data.errors).toHaveLength(2);
    });

    // ============================================
    // 分配人测试
    // ============================================

    it('should support assignee field', async () => {
      const csvContent = `title,assignee
分配任务,executor
另一个任务,architect`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(2);
      expect(data.tasks[0].assignee).toBe('executor');
      expect(data.tasks[1].assignee).toBe('architect');
    });

    // ============================================
    // 状态测试
    // ============================================

    it('should support status field', async () => {
      const csvContent = `title,status
状态任务1,pending
状态任务2,completed
状态任务3,in_progress`;

      const request = new NextRequest('http://localhost/api/tasks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(3);
      expect(data.tasks[0].status).toBe('pending');
      expect(data.tasks[1].status).toBe('completed');
      expect(data.tasks[2].status).toBe('in_progress');
    });
  });

  describe('GET /api/tasks/import', () => {
    it('should return import template and help', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.format).toBeDefined();
      expect(data.format.requiredFields).toContain('title');
      expect(data.template).toBeDefined();
    });
  });
});
