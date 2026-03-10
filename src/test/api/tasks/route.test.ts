/**
 * Tasks API 端点测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route'

// Mock auth and security modules
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
  }),
  extractToken: vi.fn().mockReturnValue('mock-token'),
  isAdmin: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
  },
}))

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return all tasks', async () => {
      const request = new NextRequest('http://localhost/api/tasks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('should filter tasks by status', async () => {
      const request = new NextRequest('http://localhost/api/tasks?status=completed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.forEach((task: { status: string }) => {
        expect(task.status).toBe('completed')
      })
    })

    it('should filter tasks by type', async () => {
      const request = new NextRequest('http://localhost/api/tasks?type=research')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.forEach((task: { type: string }) => {
        expect(task.type).toBe('research')
      })
    })

    it('should filter tasks by assignee', async () => {
      const request = new NextRequest('http://localhost/api/tasks?assignee=agent-world-expert')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.forEach((task: { assignee?: string }) => {
        expect(task.assignee).toBe('agent-world-expert')
      })
    })

    it('should combine multiple filters', async () => {
      const request = new NextRequest('http://localhost/api/tasks?status=in_progress&type=development')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.forEach((task: { status: string; type: string }) => {
        expect(task.status).toBe('in_progress')
        expect(task.type).toBe('development')
      })
    })

    it('should return empty array for non-matching filters', async () => {
      const request = new NextRequest('http://localhost/api/tasks?assignee=non-existent-agent')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(0)
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const requestBody = {
        title: 'New Test Task',
        description: 'Test task description',
        type: 'development',
        priority: 'high',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe('New Test Task')
      expect(data.status).toBe('pending')
    })

    it('should require title field', async () => {
      const requestBody = {
        description: 'Task without title',
        type: 'development',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('title')
    })

    it('should validate title is a string', async () => {
      const requestBody = {
        title: 123, // Invalid type
        description: 'Invalid title type',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('string')
    })

    it('should set default values for optional fields', async () => {
      const requestBody = {
        title: 'Minimal Task',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.type).toBe('other')
      expect(data.priority).toBe('medium')
    })

    it('should set created timestamp', async () => {
      const beforeCreate = new Date().toISOString()
      
      const requestBody = {
        title: 'Timestamped Task',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.createdAt).toBeDefined()
      expect(new Date(data.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeCreate).getTime())
    })

    it('should initialize history array', async () => {
      const requestBody = {
        title: 'Task with History',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.history).toBeDefined()
      expect(data.history).toHaveLength(1)
      expect(data.history[0].status).toBe('pending')
    })

    it('should accept assignee field', async () => {
      const requestBody = {
        title: 'Assigned Task',
        assignee: 'architect',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.assignee).toBe('architect')
    })
  })

  describe('PUT /api/tasks', () => {
    it('should update task status', async () => {
      const requestBody = {
        id: 'task-001',
        status: 'completed',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
    })

    it('should update task assignee', async () => {
      const requestBody = {
        id: 'task-001',
        assignee: 'consultant',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.assignee).toBe('consultant')
    })

    it('should require task id', async () => {
      const requestBody = {
        status: 'completed',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ID')
    })

    it('should return 404 for non-existent task', async () => {
      const requestBody = {
        id: 'non-existent-task',
        status: 'completed',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should add comment to task', async () => {
      const requestBody = {
        id: 'task-001',
        comment: 'This is a test comment',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comments).toBeDefined()
      const lastComment = data.comments[data.comments.length - 1]
      expect(lastComment.content).toBe('This is a test comment')
    })

    it('should update timestamp', async () => {
      const requestBody = {
        id: 'task-001',
        status: 'in_progress',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(data.updatedAt).toBeDefined()
    })

    it('should add history entry for status change', async () => {
      const requestBody = {
        id: 'task-002',
        status: 'completed',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      })

      const response = await PUT(request)
      const data = await response.json()

      const lastHistory = data.history[data.history.length - 1]
      expect(lastHistory.status).toBe('completed')
    })
  })

  describe('DELETE /api/tasks', () => {
    it('should require authentication', async () => {
      const { extractToken } = await import('@/lib/security/auth')
      vi.mocked(extractToken).mockReturnValueOnce(null)

      const request = new NextRequest('http://localhost/api/tasks?id=task-001', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Authentication')
    })

    it('should require task id', async () => {
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ID')
    })

    it('should return 404 for non-existent task', async () => {
      const request = new NextRequest('http://localhost/api/tasks?id=non-existent', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })

    it('should require admin role', async () => {
      const { isAdmin } = await import('@/lib/security/auth')
      vi.mocked(isAdmin).mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost/api/tasks?id=task-001', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Admin')
    })

    it('should delete task for admin user', async () => {
      const request = new NextRequest('http://localhost/api/tasks?id=task-001', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('deleted')
    })
  })
})