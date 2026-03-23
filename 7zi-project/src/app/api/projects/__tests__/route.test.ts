/**
 * Projects API Route Tests
 * 项目 API 路由测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST } from '../route';
import { GET as GET_DETAIL, PUT as PUT_DETAIL, DELETE as DELETE_DETAIL } from '../[id]/route';
import { initializeProjectTable } from '../database';
import { getDatabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth/service';
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '../types';

// ============================================================================
// Mocks
// ============================================================================

// Mock JWT verification
vi.mock('@/lib/auth/service', () => ({
  verifyJwtToken: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockUserId = 'test-user-123';
const mockToken = 'mock-jwt-token';

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  name: 'Test Project',
  description: 'A test project',
  status: 'active' as any,
  priority: 'medium' as any,
  progress: 0,
  ownerId: mockUserId,
  startDate: null,
  endDate: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建模拟请求对象
 */
function createMockRequest(
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost/api/projects');

  const mockRequest = {
    method,
    url: url.toString(),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
      has: (name: string) => headers[name.toLowerCase()] !== undefined,
    },
    json: async () => body as Record<string, unknown>,
    nextUrl: {
      searchParams: url.searchParams,
      pathname: '/api/projects',
    },
  } as unknown as Request;

  return mockRequest;
}

/**
 * 创建模拟请求对象（带 ID）
 */
function createMockRequestWithId(
  method: string,
  id: string,
  body?: unknown
): Request {
  const url = new URL(`http://localhost/api/projects/${id}`);

  const mockRequest = {
    method,
    url: url.toString(),
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') return `Bearer ${mockToken}`;
        return null;
      },
      has: () => false,
    },
    json: async () => body as Record<string, unknown>,
    nextUrl: {
      searchParams: url.searchParams,
      pathname: `/api/projects/${id}`,
    },
  } as unknown as Request;

  return mockRequest;
}

/**
 * 清理数据库
 */
function cleanupDatabase(): void {
  const db = getDatabase();
  try {
    db.exec('DELETE FROM projects');
  } catch (error) {
    // Table might not exist yet
  }
}

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeEach(() => {
  // Mock JWT verification
  (verifyJwtToken as any).mockResolvedValue({
    userId: mockUserId,
    email: 'test@example.com',
  });

  // Initialize database
  initializeProjectTable();
  cleanupDatabase();
});

afterEach(() => {
  // Cleanup
  cleanupDatabase();
  vi.clearAllMocks();
});

// ============================================================================
// GET /api/projects - List Projects Tests
// ============================================================================

describe('GET /api/projects', () => {
  it('should return empty list when no projects exist', async () => {
    const request = createMockRequest('GET');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });
  });

  it('should return list of projects', async () => {
    // Create some test projects via database
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('Project 1', 'Description 1', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Project 2', 'Description 2', 'completed', 'high', 100, mockUserId, null, null);
    stmt.run('Project 3', 'Description 3', 'active', 'low', 25, mockUserId, null, null);

    const request = createMockRequest('GET');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
  });

  it('should respect pagination parameters', async () => {
    // Create 5 projects
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 5; i++) {
      stmt.run(`Project ${i}`, `Description ${i}`, 'active', 'medium', 0, mockUserId, null, null);
    }

    const url = new URL('http://localhost/api/projects?page=2&limit=2');
    const request = createMockRequest('GET', {}, {});

    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(2);
    expect(data.pagination.total).toBe(5);
    expect(data.pagination.totalPages).toBe(3);
  });

  it('should filter by status', async () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('Active Project', 'Description 1', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Completed Project', 'Description 2', 'completed', 'high', 100, mockUserId, null, null);
    stmt.run('Another Active', 'Description 3', 'active', 'low', 25, mockUserId, null, null);

    const url = new URL('http://localhost/api/projects?status=active');
    const request = createMockRequest('GET', {}, {});

    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    data.data.forEach((project: Project) => {
      expect(project.status).toBe('active');
    });
  });

  it('should filter by priority', async () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('High Priority', 'Description 1', 'active', 'high', 50, mockUserId, null, null);
    stmt.run('Medium Priority', 'Description 2', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Another High', 'Description 3', 'active', 'high', 50, mockUserId, null, null);

    const url = new URL('http://localhost/api/projects?priority=high');
    const request = createMockRequest('GET', {}, {});

    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(2);
    data.data.forEach((project: Project) => {
      expect(project.priority).toBe('high');
    });
  });

  it('should search by name or description', async () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('Website Project', 'Building a website', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Mobile App', 'Building a mobile app', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('E-commerce Site', 'Online store', 'active', 'medium', 50, mockUserId, null, null);

    const url = new URL('http://localhost/api/projects?search=website');
    const request = createMockRequest('GET', {}, {});

    const response = await GET(request);
    const data = await response.json();

    expect(data.data).toHaveLength(1);
    expect(data.data[0].name).toBe('Website Project');
  });

  it('should sort by creation date', async () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run('Project C', 'Description C', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Project A', 'Description A', 'active', 'medium', 50, mockUserId, null, null);
    stmt.run('Project B', 'Description B', 'active', 'medium', 50, mockUserId, null, null);

    const url = new URL('http://localhost/api/projects?sortBy=createdAt&sortOrder=asc');
    const request = createMockRequest('GET', {}, {});

    const response = await GET(request);
    const data = await response.json();

    expect(data.data[0].name).toBe('Project C');
    expect(data.data[1].name).toBe('Project A');
    expect(data.data[2].name).toBe('Project B');
  });
});

// ============================================================================
// POST /api/projects - Create Project Tests
// ============================================================================

describe('POST /api/projects', () => {
  it('should create a new project with valid data', async () => {
    const requestBody: CreateProjectRequest = {
      name: 'New Project',
      description: 'A new test project',
      status: 'active',
      priority: 'high',
      progress: 0,
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('New Project');
    expect(data.data.description).toBe('A new test project');
    expect(data.data.status).toBe('active');
    expect(data.data.priority).toBe('high');
    expect(data.data.progress).toBe(0);
    expect(data.data.ownerId).toBe(mockUserId);
    expect(data.message).toBe('Project created successfully');
  });

  it('should create a project with minimal required fields', async () => {
    const requestBody: CreateProjectRequest = {
      name: 'Minimal Project',
      description: 'Description',
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Minimal Project');
    expect(data.data.status).toBe('active'); // Default
    expect(data.data.priority).toBe('medium'); // Default
    expect(data.data.progress).toBe(0); // Default
  });

  it('should reject empty project name', async () => {
    const requestBody = {
      name: '   ',
      description: 'Description',
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('name');
  });

  it('should reject invalid project status', async () => {
    const requestBody = {
      name: 'Test Project',
      description: 'Description',
      status: 'invalid-status',
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('status');
  });

  it('should reject invalid priority', async () => {
    const requestBody = {
      name: 'Test Project',
      description: 'Description',
      priority: 'invalid-priority',
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('priority');
  });

  it('should reject progress outside 0-100 range', async () => {
    const requestBody = {
      name: 'Test Project',
      description: 'Description',
      progress: 150,
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('progress');
  });
});

// ============================================================================
// GET /api/projects/:id - Get Project Detail Tests
// ============================================================================

describe('GET /api/projects/:id', () => {
  let projectId: number;

  beforeEach(() => {
    // Create a test project
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'Test Project',
      'Test Description',
      'active',
      'high',
      50,
      mockUserId,
      null,
      null
    );
    projectId = result.lastInsertRowid as number;
  });

  it('should return project details for valid ID', async () => {
    const request = createMockRequestWithId('GET', projectId.toString());
    const response = await GET_DETAIL(request, { params: Promise.resolve({ id: projectId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe(projectId);
    expect(data.data.name).toBe('Test Project');
  });

  it('should return 404 for non-existent project', async () => {
    const request = createMockRequestWithId('GET', '99999');
    const response = await GET_DETAIL(request, { params: Promise.resolve({ id: '99999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 400 for invalid project ID', async () => {
    const request = createMockRequestWithId('GET', 'invalid');
    const response = await GET_DETAIL(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// PUT /api/projects/:id - Update Project Tests
// ============================================================================

describe('PUT /api/projects/:id', () => {
  let projectId: number;

  beforeEach(() => {
    // Create a test project
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'Test Project',
      'Test Description',
      'active',
      'medium',
      50,
      mockUserId,
      null,
      null
    );
    projectId = result.lastInsertRowid as number;
  });

  it('should update project with valid data', async () => {
    const requestBody: UpdateProjectRequest = {
      name: 'Updated Project',
      progress: 75,
    };

    const request = createMockRequestWithId('PUT', projectId.toString(), requestBody);
    const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: projectId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Updated Project');
    expect(data.data.progress).toBe(75);
    expect(data.message).toBe('Project updated successfully');
  });

  it('should update status and priority', async () => {
    const requestBody: UpdateProjectRequest = {
      status: 'completed',
      priority: 'urgent',
    };

    const request = createMockRequestWithId('PUT', projectId.toString(), requestBody);
    const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: projectId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('completed');
    expect(data.data.priority).toBe('urgent');
  });

  it('should return 404 when updating non-existent project', async () => {
    const requestBody: UpdateProjectRequest = {
      name: 'Updated Project',
    };

    const request = createMockRequestWithId('PUT', '99999', requestBody);
    const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: '99999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should reject invalid status on update', async () => {
    const requestBody = {
      status: 'invalid-status',
    };

    const request = createMockRequestWithId('PUT', projectId.toString(), requestBody);
    const response = await PUT_DETAIL(request, { params: Promise.resolve({ id: projectId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// DELETE /api/projects/:id - Delete Project Tests
// ============================================================================

describe('DELETE /api/projects/:id', () => {
  let projectId: number;

  beforeEach(() => {
    // Create a test project
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status, priority, progress, owner_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      'Test Project',
      'Test Description',
      'active',
      'medium',
      50,
      mockUserId,
      null,
      null
    );
    projectId = result.lastInsertRowid as number;
  });

  it('should delete project successfully', async () => {
    const request = createMockRequestWithId('DELETE', projectId.toString());
    const response = await DELETE_DETAIL(request, { params: Promise.resolve({ id: projectId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Project deleted successfully');

    // Verify project is deleted
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(projectId);
    expect(row).toBeNull();
  });

  it('should return 404 when deleting non-existent project', async () => {
    const request = createMockRequestWithId('DELETE', '99999');
    const response = await DELETE_DETAIL(request, { params: Promise.resolve({ id: '99999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 400 for invalid project ID', async () => {
    const request = createMockRequestWithId('DELETE', 'invalid');
    const response = await DELETE_DETAIL(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// Authentication Tests
// ============================================================================

describe('Authentication', () => {
  it('should reject requests without authentication', async () => {
    (verifyJwtToken as any).mockResolvedValue(null);

    const requestBody: CreateProjectRequest = {
      name: 'Test Project',
      description: 'Description',
    };

    const request = createMockRequest('POST', requestBody);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('Input Validation', () => {
  it('should reject project name exceeding 100 characters', async () => {
    const requestBody: CreateProjectRequest = {
      name: 'A'.repeat(101),
      description: 'Description',
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('100');
  });

  it('should reject project description exceeding 1000 characters', async () => {
    const requestBody = {
      name: 'Test Project',
      description: 'D'.repeat(1001),
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('1000');
  });

  it('should reject non-integer progress value', async () => {
    const requestBody = {
      name: 'Test Project',
      description: 'Description',
      progress: 50.5,
    };

    const request = createMockRequest('POST', requestBody, {
      Authorization: `Bearer ${mockToken}`,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('integer');
  });
});
