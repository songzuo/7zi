/**
 * Tasks API 高级筛选测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the repository
vi.mock('@/lib/db/tasks.repository', () => ({
  getAllTasks: vi.fn(() => [
    {
      id: 'task-1',
      title: 'Test Task 1',
      description: 'Description 1',
      priority: 'high',
      status: 'todo',
      tags: [{ id: 'bug', name: 'Bug', color: 'red' }],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'task-2',
      title: 'Test Task 2',
      description: 'Description 2',
      priority: 'medium',
      status: 'in_progress',
      tags: [{ id: 'feature', name: 'Feature', color: 'blue' }],
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    },
  ])),
  filterTasks: vi.fn((filter) => {
    const tasks = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        description: 'Description 1',
        priority: 'high',
        status: 'todo',
        tags: [{ id: 'bug', name: 'Bug', color: 'red' }],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        description: 'Description 2',
        priority: 'medium',
        status: 'in_progress',
        tags: [{ id: 'feature', name: 'Feature', color: 'blue' }],
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
      },
    ];
    
    // Simple filter simulation
    let filtered = tasks;
    if (filter.priority) {
      filtered = filtered.filter(t => t.priority === filter.priority);
    }
    if (filter.status) {
      filtered = filtered.filter(t => t.status === filter.status);
    }
    
    return filtered;
  }),
  createTask: vi.fn((data) => ({
    id: 'task-new',
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
}));

describe('Tasks API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all tasks when no filters', async () => {
    const url = new URL('http://localhost/api/tasks');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tasks).toBeDefined();
    expect(Array.isArray(data.tasks)).toBe(true);
    expect(data.filter).toBeDefined();
    expect(data.filter.count).toBeDefined();
  });

  it('should filter tasks by priority', async () => {
    const url = new URL('http://localhost/api/tasks?priority=high');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.priority).toBe('high');
  });

  it('should filter tasks by status', async () => {
    const url = new URL('http://localhost/api/tasks?status=todo');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.status).toBe('todo');
  });

  it('should filter tasks by search', async () => {
    const url = new URL('http://localhost/api/tasks?search=test');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.search).toBe('test');
  });

  it('should filter tasks by tags', async () => {
    const url = new URL('http://localhost/api/tasks?tags=bug,feature');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.tags).toEqual(['bug', 'feature']);
  });

  it('should filter tasks by assignee', async () => {
    const url = new URL('http://localhost/api/tasks?assignee=Executor');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.assignee).toBe('Executor');
  });

  it('should filter tasks by date range', async () => {
    const url = new URL('http://localhost/api/tasks?dueDateFrom=2026-01-01&dueDateTo=2026-01-31');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.dueDateFrom).toBe('2026-01-01');
    expect(data.filter.applied.dueDateTo).toBe('2026-01-31');
  });

  it('should sort tasks by field', async () => {
    const url = new URL('http://localhost/api/tasks?sortBy=dueDate&sortOrder=asc');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.sortBy).toBe('dueDate');
    expect(data.filter.applied.sortOrder).toBe('asc');
  });

  it('should handle multiple filters at once', async () => {
    const url = new URL('http://localhost/api/tasks?priority=high&status=todo&search=bug');
    const request = new NextRequest(url);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filter.applied.priority).toBe('high');
    expect(data.filter.applied.status).toBe('todo');
    expect(data.filter.applied.search).toBe('bug');
  });
});

describe('Tasks API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new task', async () => {
    const url = new URL('http://localhost/api/tasks');
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Task',
        description: 'New Description',
        priority: 'high',
        status: 'todo',
        tags: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.task).toBeDefined();
    expect(data.task.title).toBe('New Task');
  });

  it('should return 400 for missing title', async () => {
    const url = new URL('http://localhost/api/tasks');
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        description: 'No title',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('should use default values for optional fields', async () => {
    const url = new URL('http://localhost/api/tasks');
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Minimal Task',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.task).toBeDefined();
  });
});