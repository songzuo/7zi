import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/route';

// Mock all dependencies
vi.mock('@/lib/data/projects.server', () => {
  const mockProjectsArray = [
    {
      id: 'proj-1',
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test description',
      status: 'active',
      priority: 'high',
      members: ['member-1'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];
  
  return {
    projects: mockProjectsArray,
    createProject: vi.fn((data: any) => ({
      id: 'new-proj-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    getProjectsByStatus: vi.fn((status: string) => 
      mockProjectsArray.filter(p => p.status === status)
    ),
    getProjectsByPriority: vi.fn((priority: string) =>
      mockProjectsArray.filter(p => p.priority === priority)
    )
  };
});

vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin'
  }),
  extractToken: vi.fn().mockReturnValue('mock-token'),
  isAdmin: vi.fn().mockReturnValue(true)
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null))
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn()
  }
}));

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const request = new NextRequest('http://localhost/api/projects');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter projects by status', async () => {
      const request = new NextRequest('http://localhost/api/projects?status=active');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter projects by priority', async () => {
      const request = new NextRequest('http://localhost/api/projects?priority=high');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter projects by member', async () => {
      const request = new NextRequest('http://localhost/api/projects?assignee=member-1');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const requestBody = {
        name: 'New Project',
        description: 'New project description',
        status: 'active',
        priority: 'high'
      };
      
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('New Project');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
    });

    it('should reject non-string name', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 123 })
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
    });
  });
});
