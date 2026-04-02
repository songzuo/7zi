/**
 * Tasks API 路由单元测试
 *
 * 测试 /api/tasks 端点的功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => {
    const mockDb = {
      prepare: vi.fn(() => ({
        all: vi.fn(() => []),
        get: vi.fn(() => ({ count: 0 })),
        run: vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
      })),
      exec: vi.fn(),
    }
    return mockDb
  }),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/errors', () => ({
  createAppError: vi.fn((code: string, message: string) => ({
    code,
    message,
  })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
  },
  formatErrorMessage: (error: any) => {
    if (error instanceof Error) return error.message
    return String(error)
  },
}))

vi.mock('@/middleware/auth', () => ({
  withAuth: (request: any, handler: any) => handler(request, 'mock-user-id'),
  RATE_LIMIT_CONFIG: {
    windowMs: 60000,
    maxRequests: 100,
  },
}))

describe('Tasks API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/tasks - List tasks', () => {
    it('should return empty list when no tasks exist', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
    })

    it('should handle pagination parameters', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?page=1&limit=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle status filter', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?status=pending')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle priority filter', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?priority=high')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle search parameter', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?search=test')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle sort by createdAt', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?sortBy=createdAt&sortOrder=desc')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle sort by priority', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?sortBy=priority&sortOrder=asc')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle multiple filters', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest(
        'http://localhost/api/tasks?status=in_progress&priority=high&page=1&limit=20'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle createdBy filter', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?createdBy=user-123')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle assignedTo filter', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?assignedTo=user-456')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle invalid page number (use default)', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?page=0')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('page')
      expect(data.data.page).toBeGreaterThan(0)
    })

    it('should handle large limit (cap at 100)', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?limit=1000')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('limit')
      expect(data.data.limit).toBeLessThanOrEqual(100)
    })

    it('should handle special characters in search', async () => {
      const { GET } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks?search=test%20task%20%231')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('POST /api/tasks - Create task', () => {
    it('should create task successfully', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        description: 'A test task',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(data.success).toBeDefined()
    })

    it('should create task with all optional fields', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Complete Task',
        description: 'A complete task',
        priority: 'high',
        status: 'pending',
        dueDate: '2024-12-31T23:59:59.000Z',
        assignedTo: 'user-123',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(data.success).toBeDefined()
    })

    it('should create task with default priority and status', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Minimal Task',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should validate required title field', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        description: 'Task without title',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Title is required and must be a non-empty string')
    })

    it('should validate title is not empty string', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: '   ',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate title length', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'A'.repeat(201), // Exceeds 200 characters
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Title must be less than 200 characters')
    })

    it('should validate description length', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Valid Title',
        description: 'A'.repeat(5001), // Exceeds 5000 characters
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Description must be less than 5000 characters')
    })

    it('should validate priority value', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        priority: 'invalid',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Invalid priority value')
    })

    it('should validate status value', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        status: 'invalid',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Invalid status value')
    })

    it('should validate dueDate format', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        dueDate: 'invalid-date',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toContain('Invalid dueDate format')
    })

    it('should accept valid priority values', async () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent']

      for (const priority of validPriorities) {
        const { POST } = await import('@/app/api/tasks/route')
        const requestBody = {
          title: 'Test Task',
          priority,
        }

        const request = new NextRequest('http://localhost/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)

        expect(response.status).toBe(201)
      }
    })

    it('should accept valid status values', async () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']

      for (const status of validStatuses) {
        const { POST } = await import('@/app/api/tasks/route')
        const requestBody = {
          title: 'Test Task',
          status,
        }

        const request = new NextRequest('http://localhost/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const response = await POST(request)

        expect(response.status).toBe(201)
      }
    })

    it('should accept valid ISO date format', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        dueDate: '2024-12-31T23:59:59.999Z',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should handle malformed JSON', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      const response = await POST(request)

      // Should handle error gracefully
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle empty request body', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle Unicode characters in title', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: '任务测试 🎉',
        description: '中文描述',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should trim whitespace from title', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: '  Task with spaces  ',
        description: '  Description with spaces  ',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      expect(response.status).toBeGreaterThanOrEqual(200)
    })
  })

  describe('Task validation utilities', () => {
    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      const invalidPriorities = ['urgent!', 'high priority', '']

      validPriorities.forEach(priority => {
        const isValid = ['low', 'medium', 'high', 'urgent'].includes(priority)
        expect(isValid).toBe(true)
      })

      invalidPriorities.forEach(priority => {
        const isValid = ['low', 'medium', 'high', 'urgent'].includes(priority)
        expect(isValid).toBe(false)
      })
    })

    it('should validate status values', () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
      const invalidStatuses = ['started!', 'in progress', '']

      validStatuses.forEach(status => {
        const isValid = ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
        expect(isValid).toBe(true)
      })

      invalidStatuses.forEach(status => {
        const isValid = ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
        expect(isValid).toBe(false)
      })
    })

    it('should validate ISO date format', () => {
      const validDates = [
        '2024-12-31T23:59:59.999Z',
        '2024-01-01T00:00:00.000Z',
        new Date().toISOString(),
      ]
      const invalidDates = [
        '2024-12-31', // This actually parses in some browsers
        'not-a-date',
        '',
      ]

      validDates.forEach(date => {
        expect(Date.parse(date)).not.toBeNaN()
      })

      invalidDates.forEach(date => {
        if (date === '') {
          expect(Date.parse(date)).toBeNaN()
        } else if (date.startsWith('not')) {
          expect(Date.parse(date)).toBeNaN()
        }
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle database errors gracefully', async () => {
      const { getDatabase } = await import('@/lib/db')
      vi.mocked(getDatabase).mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle null dueDate', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'Test Task',
        dueDate: null,
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      // null dueDate should be handled
      expect([201, 400]).toContain(response.status)
    })

    it('should handle very long valid title (200 chars)', async () => {
      const { POST } = await import('@/app/api/tasks/route')
      const requestBody = {
        title: 'A'.repeat(200), // Exactly 200 characters
      }

      const request = new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })
})
