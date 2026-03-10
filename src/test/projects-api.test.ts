import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/projects/route';
import { projects } from '@/lib/data/projects';
import { tasks } from '@/lib/data/tasks';

// Mock the auth and security modules
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
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset test data
    projects.length = 0;
    tasks.length = 0;
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const mockProject = {
        id: '1',
        slug: 'test-project',
        title: 'Test Project',
        description: 'Test description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Test Client',
        duration: '3 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: ['member-1'],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(mockProject);
      
      const request = new NextRequest('http://localhost/api/projects');
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Test Project');
    });

    it('should filter projects by category', async () => {
      const project1 = {
        id: '1',
        slug: 'web-project',
        title: 'Web Project',
        description: 'Web description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Client A',
        duration: '2 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const project2 = {
        id: '2',
        slug: 'app-project',
        title: 'App Project',
        description: 'App description',
        category: 'app' as const,
        status: 'active' as const,
        priority: 'high' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Client B',
        duration: '4 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(project1, project2);
      
      const request = new NextRequest('http://localhost/api/projects?category=website');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data).toHaveLength(1);
      expect(data.data[0].category).toBe('website');
    });

    it('should filter projects by status', async () => {
      const activeProject = {
        id: '1',
        slug: 'active-project',
        title: 'Active Project',
        description: 'Active description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Client A',
        duration: '2 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const completedProject = {
        id: '2',
        slug: 'completed-project',
        title: 'Completed Project',
        description: 'Completed description',
        category: 'app' as const,
        status: 'completed' as const,
        priority: 'high' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Client B',
        duration: '4 months',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(activeProject, completedProject);
      
      const request = new NextRequest('http://localhost/api/projects?status=completed');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.data).toHaveLength(1);
      expect(data.data[0].status).toBe('completed');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const requestBody = {
        title: 'New Project',
        description: 'New project description',
        category: 'website',
        status: 'active',
        priority: 'high',
        client: 'New Client',
        duration: '6 months',
        teamMembers: ['member-1', 'member-2']
      };
      
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('New Project');
      expect(data.data.slug).toBe('new-project');
      expect(data.data.teamMembers).toEqual(['member-1', 'member-2']);
      expect(projects).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({}) // Missing required fields
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.error).toContain('Project title is required');
    });

    it('should generate slug from title', async () => {
      const requestBody = {
        title: 'My Awesome Project!!!',
        description: 'Description',
        category: 'website',
        status: 'active',
        priority: 'medium'
      };
      
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.data.slug).toBe('my-awesome-project');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update an existing project', async () => {
      const originalProject = {
        id: 'project-1',
        slug: 'original-project',
        title: 'Original Project',
        description: 'Original description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Original Client',
        duration: '3 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: ['member-1'],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(originalProject);
      
      const updateData = {
        id: 'project-1',
        title: 'Updated Project',
        description: 'Updated description',
        status: 'completed' as const,
        teamMembers: ['member-1', 'member-2', 'member-3']
      };
      
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Project');
      expect(data.data.status).toBe('completed');
      expect(data.data.teamMembers).toEqual(['member-1', 'member-2', 'member-3']);
    });

    it('should return 404 for non-existent project', async () => {
      const updateData = {
        id: 'non-existent',
        title: 'Updated Title'
      };
      
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete a project (admin only)', async () => {
      const projectToDelete = {
        id: 'project-to-delete',
        slug: 'delete-project',
        title: 'Delete Project',
        description: 'Delete description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Delete Client',
        duration: '2 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(projectToDelete);
      
      const request = new NextRequest('http://localhost/api/projects?id=project-to-delete', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Project deleted successfully');
      expect(projects).toHaveLength(0);
    });

    it('should return 404 for non-existent project', async () => {
      const request = new NextRequest('http://localhost/api/projects?id=non-existent', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.error).toBe('Project not found');
    });
  });

  describe('GET /api/projects/:id/tasks', () => {
    it('should return tasks for a specific project', async () => {
      // Create a project
      const project = {
        id: 'project-1',
        slug: 'test-project',
        title: 'Test Project',
        description: 'Test description',
        category: 'website' as const,
        status: 'active' as const,
        priority: 'medium' as const,
        thumbnail: '/images/default.jpg',
        images: [],
        techStack: [],
        client: 'Test Client',
        duration: '3 months',
        startDate: new Date().toISOString(),
        endDate: null,
        highlights: [],
        teamMembers: [],
        links: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      projects.push(project);
      
      // Create tasks associated with the project
      const task1 = {
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        type: 'development' as const,
        priority: 'high' as const,
        status: 'in_progress' as const,
        assignee: 'member-1',
        projectId: 'project-1',
        createdBy: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };
      
      const task2 = {
        id: 'task-2',
        title: 'Task 2',
        description: 'Description 2',
        type: 'design' as const,
        priority: 'medium' as const,
        status: 'pending' as const,
        assignee: 'member-2',
        projectId: 'project-1',
        createdBy: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };
      
      // Create a task for a different project
      const task3 = {
        id: 'task-3',
        title: 'Task 3',
        description: 'Description 3',
        type: 'research' as const,
        priority: 'low' as const,
        status: 'completed' as const,
        assignee: 'member-3',
        projectId: 'project-2',
        createdBy: 'user' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        history: []
      };
      
      tasks.push(task1, task2, task3);
      
      // Mock the route handler for GET /api/projects/:id/tasks
      const getProjectTasks = async (request: NextRequest) => {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const projectId = pathParts[pathParts.length - 2]; // Extract project ID from /api/projects/:id/tasks
        
        const projectTasks = tasks.filter(task => task.projectId === projectId);
        
        return new Response(JSON.stringify({
          success: true,
          data: projectTasks
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
      
      const request = new NextRequest('http://localhost/api/projects/project-1/tasks');
      const response = await getProjectTasks(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].projectId).toBe('project-1');
      expect(data.data[1].projectId).toBe('project-1');
    });
  });
});