/**
 * Projects API 集成测试
 * 测试项目 CRUD 操作的完整流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/route';
import { GET as GET_PROJECT, PUT, DELETE } from '@/app/api/projects/[id]/route';
import { projects } from '@/lib/data/projects';

// Mock 依赖
const mockExtractToken = vi.fn().mockReturnValue('mock-token');

vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin']
  }),
  extractToken: (...args: unknown[]) => mockExtractToken(...args),
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
}));

// 辅助函数：创建请求
function createRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const request = new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'mock-csrf-token',
    }),
  });
  return request;
}

// 辅助函数：重置项目数据
function resetProjects() {
  projects.length = 0;
  projects.push(
    {
      id: 'proj-001',
      title: 'AI-Powered Analytics Dashboard',
      description: 'A comprehensive analytics platform',
      status: 'active' as const,
      priority: 'high' as const,
      members: ['agent-world-expert', 'architect'],
      metadata: { category: 'website' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'proj-002',
      title: 'Mobile E-commerce Platform',
      description: 'A fully responsive e-commerce platform',
      status: 'active' as const,
      priority: 'medium' as const,
      members: ['designer', 'executor'],
      metadata: { category: 'app' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'proj-003',
      title: 'Blockchain Supply Chain Tracker',
      description: 'A decentralized supply chain management system',
      status: 'paused' as const,
      priority: 'high' as const,
      members: ['consultant', 'architect'],
      metadata: { category: 'website' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );
}

describe('Projects API - 列表和创建', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProjects();
  });

  describe('GET /api/projects', () => {
    it('应该返回所有项目', async () => {
      const request = createRequest('GET', '/api/projects');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('应该按状态过滤项目', async () => {
      const request = createRequest('GET', '/api/projects?status=active');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      data.data.forEach((project: any) => {
        expect(project.status).toBe('active');
      });
    });

    it('应该按优先级过滤项目', async () => {
      const request = createRequest('GET', '/api/projects?priority=high');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      data.data.forEach((project: any) => {
        expect(project.priority).toBe('high');
      });
    });

    it('应该按成员过滤项目', async () => {
      const request = createRequest('GET', '/api/projects?assignee=architect');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.length).toBeGreaterThan(0);
    });

    it('空结果时应该返回空数组', async () => {
      projects.length = 0;
      const request = createRequest('GET', '/api/projects?status=completed');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(0);
    });
  });

  describe('POST /api/projects', () => {
    it('应该创建新项目', async () => {
      const requestBody = {
        title: 'New Project',
        description: 'New project description',
        category: 'website',
        status: 'active',
        priority: 'high',
        members: ['member-1', 'member-2'],
      };

      const request = createRequest('POST', '/api/projects', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Project');
      expect(data.data.id).toBeDefined();
    });

    it('应该创建项目（无自动 slug 生成）', async () => {
      const requestBody = {
        title: 'My Awesome Project 2024',
        description: 'Description',
        status: 'active',
        priority: 'medium',
      };

      const request = createRequest('POST', '/api/projects', requestBody);
      const response = await POST(request);
      const data = await response.json();

      // 当前实现不自动生成 slug
      expect(response.status).toBe(201);
      expect(data.data.title).toBe('My Awesome Project 2024');
    });

    it('未认证应该返回 401', async () => {
      mockExtractToken.mockReturnValue(null);

      const requestBody = {
        title: 'New Project',
        description: 'Description',
        status: 'active',
      };

      const request = createRequest('POST', '/api/projects', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(401);
      mockExtractToken.mockReturnValue('mock-token');
    });
  });
});

describe('Projects API - 详情、更新、删除', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProjects();
  });

  describe('GET /api/projects/:id', () => {
    it('应该返回指定项目', async () => {
      const request = createRequest('GET', '/api/projects/proj-001');
      const response = await GET_PROJECT(request, { params: { id: 'proj-001' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('proj-001');
    });

    it('项目不存在应该返回 404', async () => {
      const request = createRequest('GET', '/api/projects/non-existent');
      const response = await GET_PROJECT(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('应该更新项目', async () => {
      const updateData = {
        title: 'Updated Project Title',
        status: 'completed',
        priority: 'low',
      };

      const request = createRequest('PUT', '/api/projects/proj-001', updateData);
      const response = await PUT(request, { params: { id: 'proj-001' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Project Title');
    });

    it('项目不存在应该返回 404', async () => {
      const updateData = { title: 'Updated' };

      const request = createRequest('PUT', '/api/projects/non-existent', updateData);
      const response = await PUT(request, { params: { id: 'non-existent' } });

      expect(response.status).toBe(404);
    });

    it('未认证应该返回 401', async () => {
      mockExtractToken.mockReturnValue(null);

      const request = createRequest('PUT', '/api/projects/proj-001', { title: 'Updated' });
      const response = await PUT(request, { params: { id: 'proj-001' } });

      expect(response.status).toBe(401);
      mockExtractToken.mockReturnValue('mock-token');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('应该删除项目', async () => {
      const request = createRequest('DELETE', '/api/projects/proj-001');
      const response = await DELETE(request, { params: { id: 'proj-001' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Project deleted');
    });

    it('项目不存在应该返回 404', async () => {
      const request = createRequest('DELETE', '/api/projects/non-existent');
      const response = await DELETE(request, { params: { id: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
    });

    it('未认证应该返回 401', async () => {
      mockExtractToken.mockReturnValue(null);

      const request = createRequest('DELETE', '/api/projects/proj-001');
      const response = await DELETE(request, { params: { id: 'proj-001' } });

      expect(response.status).toBe(401);
      mockExtractToken.mockReturnValue('mock-token');
    });
  });
});

describe('Projects API - 集成场景', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProjects();
  });

  it('完整 CRUD 流程', async () => {
    // 1. 创建项目
    const createRequest = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Integration Test Project',
        description: 'Testing full CRUD',
        status: 'active',
        priority: 'medium',
        members: ['test-user'],
      }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    const createResponse = await POST(createRequest);
    const createData = await createResponse.json();
    expect(createResponse.status).toBe(201);
    const projectId = createData.data.id;

    // 2. 获取项目
    const getRequest = new NextRequest(`http://localhost/api/projects/${projectId}`);
    const getResponse = await GET_PROJECT(getRequest, { params: { id: projectId } });
    const getData = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getData.data.title).toBe('Integration Test Project');

    // 3. 更新项目
    const updateRequest = new NextRequest(`http://localhost/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed', priority: 'high' }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
    const updateResponse = await PUT(updateRequest, { params: { id: projectId } });
    const updateData = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updateData.data.status).toBe('completed');

    // 4. 删除项目
    const deleteRequest = new NextRequest(`http://localhost/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    const deleteResponse = await DELETE(deleteRequest, { params: { id: projectId } });
    expect(deleteResponse.status).toBe(200);
  });

  it('优先级过滤', async () => {
    const filterRequest = new NextRequest('http://localhost/api/projects?priority=high');
    const filterResponse = await GET(filterRequest);
    const filterData = await filterResponse.json();

    expect(filterData.data.length).toBeGreaterThan(0);
    filterData.data.forEach((project: any) => {
      expect(project.priority).toBe('high');
    });
  });
});

describe('Projects API - 边界情况', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProjects();
  });

  it('应该处理特殊字符', async () => {
    const request = createRequest('POST', '/api/projects', {
      title: 'Project with "quotes" and emojis 🚀',
      description: 'Description',
      status: 'active',
    });
    const response = await POST(request);
    expect([200, 201]).toContain(response.status);
  });

  it('应该处理空的成员列表', async () => {
    const request = createRequest('POST', '/api/projects', {
      title: 'Solo Project',
      description: 'No members',
      status: 'active',
      members: [],
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
