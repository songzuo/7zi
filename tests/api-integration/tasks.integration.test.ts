/**
 * @fileoverview Tasks API integration tests
 * @description Tests for /api/tasks endpoints using MSW handlers
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { server, mockData } from './mocks/handlers';

function getAuthHeader(userId: string): HeadersInit {
  const token = mockData.generateToken(userId);
  return { 'Authorization': `Bearer ${token}` };
}

describe('/api/tasks - Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    mockData.resetTasks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/tasks', () => {
    it('should create a task with valid data', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Task description',
          priority: 'high',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Test Task');
      expect(data.data.priority).toBe('high');
      expect(data.data.status).toBe('pending');
    });

    it('should reject task creation without auth token', async () => {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Task' }),
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should reject task creation without title', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ description: 'No title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject task with title exceeding 200 characters', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      const longTitle = 'A'.repeat(201);

      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ title: longTitle }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject task with invalid priority', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ title: 'Test Task', priority: 'invalid' }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should create task with default priority medium', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ title: 'Test Task' }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.priority).toBe('medium');
      expect(data.data.status).toBe('pending');
    });

    it('should create task with all valid priority values', async () => {
      const user = mockData.createUser({
        email: 'creator@example.com',
        password: 'SecurePass123',
        name: 'Task Creator',
      });

      for (const priority of ['low', 'medium', 'high', 'urgent'] as const) {
        const response = await fetch('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(user.id),
          },
          body: JSON.stringify({ title: `Task ${priority}`, priority }),
        });

        const data = await response.json();
        expect(response.status).toBe(201);
        expect(data.data.priority).toBe(priority);
      }
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(() => {
      // Create test tasks
      const user = mockData.createUser({
        email: 'listuser@example.com',
        password: 'SecurePass123',
        name: 'List User',
      });
      mockData.generateToken(user.id);

      mockData.createTaskFull({ title: 'Task 1', priority: 'high', status: 'pending', createdBy: user.id });
      mockData.createTaskFull({ title: 'Task 2', priority: 'medium', status: 'in_progress', createdBy: user.id });
      mockData.createTaskFull({ title: 'Task 3', priority: 'low', status: 'completed', createdBy: user.id });
    });

    it('should return paginated list of tasks', async () => {
      const response = await fetch('http://localhost:3000/api/tasks');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toBeDefined();
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.data.page).toBeDefined();
      expect(data.data.limit).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?status=pending');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.items.forEach((task: any) => {
        expect(task.status).toBe('pending');
      });
    });

    it('should filter tasks by priority', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?priority=high');
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.items.forEach((task: any) => {
        expect(task.priority).toBe('high');
      });
    });

    it('should search tasks by title', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?search=Task 1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items.length).toBeGreaterThan(0);
    });

    it('should paginate with limit and page', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?page=1&limit=2');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items.length).toBeLessThanOrEqual(2);
      expect(data.data.page).toBe(1);
      expect(data.data.limit).toBe(2);
    });

    it('should sort tasks by createdAt desc', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?sortBy=createdAt&sortOrder=desc');
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.data.items.length > 1) {
        const dates = data.data.items.map((t: any) => new Date(t.createdAt).getTime());
        expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
      }
    });

    it('should sort tasks by priority', async () => {
      const response = await fetch('http://localhost:3000/api/tasks?sortBy=priority&sortOrder=asc');
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a task by id', async () => {
      const user = mockData.createUser({
        email: 'getuser@example.com',
        password: 'SecurePass123',
        name: 'Get User',
      });
      mockData.generateToken(user.id);

      const task = mockData.createTaskFull({
        title: 'Single Task',
        priority: 'high',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(task.id);
      expect(data.data.title).toBe('Single Task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await fetch('http://localhost:3000/api/tasks/non-existent-id');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task title', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const task = mockData.createTaskFull({
        title: 'Original Title',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Title');
    });

    it('should update task status', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const task = mockData.createTaskFull({
        title: 'Status Task',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe('completed');
    });

    it('should update task priority', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const task = mockData.createTaskFull({
        title: 'Priority Task',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ priority: 'urgent' }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.priority).toBe('urgent');
    });

    it('should reject update without auth', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });

      const task = mockData.createTaskFull({
        title: 'Auth Task',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when updating non-existent task', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });

      const response = await fetch('http://localhost:3000/api/tasks/non-existent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(user.id),
        },
        body: JSON.stringify({ title: 'Update' }),
      });

      expect(response.status).toBe(404);
    });

    it('should reject invalid priority on update', async () => {
      const user = mockData.createUser({
        email: 'updateuser@example.com',
        password: 'SecurePass123',
        name: 'Update User',
      });
      const token = getAuthHeader(user.id);

      const task = mockData.createTaskFull({
        title: 'Invalid Priority Task',
        priority: 'medium',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...token,
        },
        body: JSON.stringify({ priority: 'super-high' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      const user = mockData.createUser({
        email: 'deleteuser@example.com',
        password: 'SecurePass123',
        name: 'Delete User',
      });
      mockData.generateToken(user.id);

      const task = mockData.createTaskFull({
        title: 'To Delete',
        priority: 'low',
        status: 'pending',
        createdBy: user.id,
      });

      const response = await fetch(`http://localhost:3000/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(task.id);

      // Verify deletion
      const getResponse = await fetch(`http://localhost:3000/api/tasks/${task.id}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent task', async () => {
      const response = await fetch('http://localhost:3000/api/tasks/non-existent', {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
