/**
 * Tasks API Route Tests
 *
 * 测试任务管理 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getDatabase } from '@/lib/db'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/errors', () => ({
  createAppError: vi.fn(),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
  },
  formatErrorMessage: vi.fn(error => error?.message || 'Unknown error'),
}))

vi.mock('@/middleware/auth', () => ({
  withAuth: vi.fn((request, handler) => {
    // Simulate authenticated user
    return handler(request, 'user-123')
  }),
}))

describe('Tasks API Route', () => {
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn(),
      }),
    }
    ;(getDatabase as any).mockReturnValue(mockDb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return paginated task list', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task 1',
          description: 'Description 1',
          priority: 'high',
          status: 'pending',
          due_date: '2026-03-30',
          created_by: 'user-123',
          assigned_to: null,
          created_at: '2026-03-23T10:00:00Z',
          updated_at: '2026-03-23T10:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Test Task 2',
          description: 'Description 2',
          priority: 'medium',
          status: 'completed',
          due_date: null,
          created_by: 'user-123',
          assigned_to: 'user-456',
          created_at: '2026-03-23T11:00:00Z',
          updated_at: '2026-03-23T11:00:00Z',
        },
      ]

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 2 }),
        all: vi.fn().mockReturnValue(mockTasks),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks?page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.items).toHaveLength(2)
      expect(data.data.total).toBe(2)
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(10)
    })

    it('should filter tasks by status', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 1 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'task-1',
            title: 'Test Task 1',
            description: 'Description 1',
            priority: 'high',
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          },
        ]),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks?status=pending')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items[0].status).toBe('pending')
    })

    it('should filter tasks by priority', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 1 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'task-1',
            title: 'Urgent Task',
            description: 'Urgent',
            priority: 'urgent',
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          },
        ]),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks?priority=urgent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items[0].priority).toBe('urgent')
    })

    it('should search tasks by keyword', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 1 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'task-1',
            title: 'Important Meeting',
            description: 'Discuss quarterly goals',
            priority: 'high',
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          },
        ]),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks?search=meeting')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items[0].title.toLowerCase()).toContain('meeting')
    })

    it('should sort tasks by createdAt', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 2 }),
        all: vi.fn().mockReturnValue([
          {
            id: 'task-1',
            title: 'Task 1',
            description: null,
            priority: 'medium',
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          },
          {
            id: 'task-2',
            title: 'Task 2',
            description: null,
            priority: 'medium',
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T09:00:00Z',
            updated_at: '2026-03-23T09:00:00Z',
          },
        ]),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/tasks?sortBy=createdAt&sortOrder=asc'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items).toHaveLength(2)
    })

    it('should handle empty task list', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 0 }),
        all: vi.fn().mockReturnValue([]),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.items).toHaveLength(0)
      expect(data.data.total).toBe(0)
    })

    it('should limit results to max 100 per page', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ total: 0 }),
        all: vi.fn().mockReturnValue([]),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks?limit=200')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.limit).toBe(100)
    })

    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task with valid data', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        status: 'pending',
        dueDate: '2026-03-30',
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
        get: vi.fn().mockReturnValue({
          id: 'task-new',
          title: 'New Task',
          description: 'Task description',
          priority: 'high',
          status: 'pending',
          due_date: '2026-03-30',
          created_by: 'user-123',
          assigned_to: null,
          created_at: '2026-03-23T10:00:00Z',
          updated_at: '2026-03-23T10:00:00Z',
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Task')
    })

    it('should create task with minimal required fields', async () => {
      const newTask = {
        title: 'Minimal Task',
      }

      mockDb.prepare.mockReturnValue({
        run: vi.fn(),
        get: vi.fn().mockReturnValue({
          id: 'task-minimal',
          title: 'Minimal Task',
          description: null,
          priority: 'medium',
          status: 'pending',
          due_date: null,
          created_by: 'user-123',
          assigned_to: null,
          created_at: '2026-03-23T10:00:00Z',
          updated_at: '2026-03-23T10:00:00Z',
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.title).toBe('Minimal Task')
      expect(data.data.priority).toBe('medium')
      expect(data.data.status).toBe('pending')
    })

    it('should reject task without title', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No title' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Title is required and must be a non-empty string')
    })

    it('should reject task with empty title', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '   ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toContain('Title is required and must be a non-empty string')
    })

    it('should reject task with title too long', async () => {
      const longTitle = 'A'.repeat(201)
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: longTitle }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toContain('Title must be less than 200 characters')
    })

    it('should reject task with invalid priority', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          priority: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toContain('Invalid priority value')
    })

    it('should reject task with invalid status', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          status: 'invalid',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toContain('Invalid status value')
    })

    it('should reject task with invalid dueDate format', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Task',
          dueDate: 'not-a-date',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toContain('Invalid dueDate format')
    })

    it('should accept all valid priority values', async () => {
      const priorities = ['low', 'medium', 'high', 'urgent']

      for (const priority of priorities) {
        mockDb.prepare.mockReturnValue({
          run: vi.fn(),
          get: vi.fn().mockReturnValue({
            id: 'task-test',
            title: 'Test Task',
            description: null,
            priority,
            status: 'pending',
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          }),
        })

        const request = new NextRequest('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Task', priority }),
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
      }
    })

    it('should accept all valid status values', async () => {
      const statuses = ['pending', 'in_progress', 'completed', 'cancelled']

      for (const status of statuses) {
        mockDb.prepare.mockReturnValue({
          run: vi.fn(),
          get: vi.fn().mockReturnValue({
            id: 'task-test',
            title: 'Test Task',
            description: null,
            priority: 'medium',
            status,
            due_date: null,
            created_by: 'user-123',
            assigned_to: null,
            created_at: '2026-03-23T10:00:00Z',
            updated_at: '2026-03-23T10:00:00Z',
          }),
        })

        const request = new NextRequest('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Task', status }),
        })

        const response = await POST(request)
        expect(response.status).toBe(201)
      }
    })

    it('should handle database errors on create', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Insert failed')
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Task' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
